// Demo data for the two reference use cases (internship in the Dominican Republic, February trip).
// Usage: pnpm seed:demo <email>   — skips a trip that already exists with the same title.
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  bookingChanges,
  bookings,
  checklistItems,
  checklists,
  destinationIdeas,
  documents,
  ideaVotes,
  tripMembers,
  trips,
  user,
} from "@/db/schema";
import { lookupPlace } from "@/lib/images";
import { saveFile } from "@/lib/storage";

// Minimal one-page PDF showing a line of text, clearly marked as an example.
function samplePdf(title: string) {
  const text = `Document d'exemple : ${title}`.replace(/[()\\]/g, "");
  const stream = `BT /F1 18 Tf 60 760 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new File([Buffer.from(pdf, "latin1")], `${title}.pdf`, { type: "application/pdf" });
}

async function addDocument(tripId: string, userId: string, name: string, category: "identite" | "billets" | "visa" | "logement") {
  const file = samplePdf(name);
  const storageKey = await saveFile(file);
  const [doc] = await db
    .insert(documents)
    .values({ tripId, name: `${name} (exemple)`, category, storageKey, mimeType: file.type, size: file.size, uploadedBy: userId })
    .returning({ id: documents.id });
  return doc.id;
}

async function tripExists(userId: string, title: string) {
  const [row] = await db.select({ id: trips.id }).from(trips).where(and(eq(trips.createdBy, userId), eq(trips.title, title)));
  return Boolean(row);
}

async function seedInternship(userId: string) {
  const title = "Stage en République dominicaine";
  if (await tripExists(userId, title)) return console.log(`« ${title} » existe déjà, ignoré`);

  const city = await lookupPlace("Saint-Domingue");
  const colonial = await lookupPlace("Zona Colonial Saint-Domingue");
  const [trip] = await db
    .insert(trips)
    .values({ title, destination: "Saint-Domingue", coverUrl: city.imageUrl, startDate: "2026-11-24", endDate: "2027-05-22", status: "preparation", createdBy: userId })
    .returning();
  await db.insert(tripMembers).values({ tripId: trip.id, userId, role: "owner" });

  // Outbound flight, moved from 17 to 24 November (use case: the flight may have to be rescheduled).
  const [flight] = await db
    .insert(bookings)
    .values({
      tripId: trip.id,
      kind: "vol",
      title: "Paris → Saint-Domingue",
      fromPlace: "Paris",
      toPlace: "Saint-Domingue",
      startAt: "2026-11-24 10:35:00",
      endAt: "2026-11-24 15:10:00",
      provider: "Air France",
      reference: "EXEMPLE1",
      price: "640 €",
      status: "reserve",
      changeDeadline: "2026-11-01",
      notes: "Vol modifiable une fois sans frais (à vérifier dans les conditions du billet).",
      imageUrl: city.imageUrl,
    })
    .returning({ id: bookings.id });
  await db.insert(bookingChanges).values({
    bookingId: flight.id,
    userId,
    summary: "Départ : mar. 17 nov. · 10:35 → mar. 24 nov. · 10:35 · Fin : mar. 17 nov. · 15:10 → mar. 24 nov. · 15:10",
  });

  const paris = await lookupPlace("Paris");
  await db.insert(bookings).values([
    {
      tripId: trip.id,
      kind: "vol",
      title: "Saint-Domingue → Paris",
      fromPlace: "Saint-Domingue",
      toPlace: "Paris",
      startAt: "2027-05-22 17:20:00",
      endAt: "2027-05-23 07:45:00",
      status: "option",
      notes: "Retour à réserver quand la date de fin de stage est confirmée.",
      imageUrl: paris.imageUrl,
    },
    {
      tripId: trip.id,
      kind: "logement",
      title: "Appartement Zona Colonial",
      toPlace: "Saint-Domingue",
      provider: "Airbnb",
      address: "Zona Colonial, Saint-Domingue",
      startAt: "2026-11-24 16:00:00",
      endAt: "2027-05-22 11:00:00",
      reference: "EXEMPLE2",
      price: "3 900 € (6 mois)",
      status: "reserve",
      notes: "Clés remises par l'hôte à l'arrivée. Wi-Fi inclus.",
      imageUrl: colonial.imageUrl ?? city.imageUrl,
    },
  ]);

  const ticketId = await addDocument(trip.id, userId, "Billet aller Paris - Saint-Domingue", "billets");
  const passportId = await addDocument(trip.id, userId, "Passeport", "identite");
  const conventionId = await addDocument(trip.id, userId, "Convention de stage", "visa");
  await addDocument(trip.id, userId, "Confirmation Airbnb", "logement");

  const [visa] = await db.insert(checklists).values({ tripId: trip.id, title: "Visa de stage", dueDate: "2026-10-30" }).returning({ id: checklists.id });
  const visaItems: { label: string; hint: string; status: "todo" | "progress" | "done"; documentId?: string }[] = [
    { label: "Passeport", hint: "Valide au moins 6 mois après le retour", status: "done", documentId: passportId },
    { label: "Formulaire de demande de visa", hint: "Rempli et signé", status: "done" },
    { label: "Photos d'identité", hint: "Format exigé par le consulat", status: "done" },
    { label: "Billet d'avion", hint: "Ou réservation aller-retour", status: "done", documentId: ticketId },
    { label: "Convention de stage", hint: "Signature de l'entreprise en attente", status: "progress", documentId: conventionId },
    { label: "Preuve d'hébergement", hint: "Confirmation Airbnb", status: "progress" },
    { label: "Justificatif de ressources", hint: "Relevés bancaires ou attestation de bourse", status: "todo" },
    { label: "Extrait de casier judiciaire", hint: "Demande en ligne, quelques jours de délai", status: "todo" },
    { label: "Certificat médical", hint: "Prendre rendez-vous", status: "todo" },
    { label: "Assurance santé et rapatriement", hint: "Couvrant toute la durée du séjour", status: "todo" },
  ];
  await db.insert(checklistItems).values(visaItems.map((item, position) => ({ ...item, checklistId: visa.id, position })));

  const [prep] = await db.insert(checklists).values({ tripId: trip.id, title: "Avant le départ", dueDate: "2026-11-20" }).returning({ id: checklists.id });
  await db.insert(checklistItems).values(
    [
      ["Prévenir la banque", "Paiements à l'étranger", "done"],
      ["Forfait téléphone ou carte SIM locale", "", "todo"],
      ["Adaptateur de prise", "Prises de type A et B", "todo"],
      ["Copies des papiers d'identité", "Ajoutées dans Documents", "done"],
    ].map(([label, hint, status], position) => ({
      checklistId: prep.id,
      label,
      hint: hint || null,
      status: status as "todo" | "done",
      position,
    })),
  );

  const malecon = await lookupPlace("Malecón Saint-Domingue");
  await db.insert(activities).values([
    { tripId: trip.id, day: "2026-11-24", time: "19:30", title: "Dîner tranquille près du logement", place: "Zona Colonial", imageUrl: colonial.imageUrl },
    { tripId: trip.id, day: "2026-11-25", time: "10:00", title: "Acheter une carte SIM locale", notes: "Prévoir le passeport" },
    { tripId: trip.id, day: "2026-11-25", time: "14:00", title: "Repérer le trajet vers le lieu de stage", notes: "Tester le temps de trajet" },
    { tripId: trip.id, day: "2026-11-26", time: "09:00", title: "Premier jour de stage", place: "[Adresse de l'entreprise]" },
    { tripId: trip.id, day: "2026-11-28", time: "17:00", title: "Balade sur le Malecón", place: "Malecón", imageUrl: malecon.imageUrl ?? city.imageUrl },
  ]);
  console.log(`« ${title} » créé`);
}

async function seedFebruary(userId: string) {
  const title = "Février à deux";
  if (await tripExists(userId, title)) return console.log(`« ${title} » existe déjà, ignoré`);

  const [trip] = await db
    .insert(trips)
    .values({ title, startDate: "2027-02-13", endDate: "2027-02-20", status: "idee", createdBy: userId })
    .returning();
  await db.insert(tripMembers).values({ tripId: trip.id, userId, role: "owner" });

  for (const [name, liked] of [
    ["Lisbonne", true],
    ["Marrakech", true],
    ["Laponie finlandaise", false],
    ["Rome", false],
  ] as const) {
    const { imageUrl, summary } = await lookupPlace(name);
    const [idea] = await db
      .insert(destinationIdeas)
      .values({ tripId: trip.id, name, imageUrl, summary, createdBy: userId })
      .returning({ id: destinationIdeas.id });
    if (liked) await db.insert(ideaVotes).values({ ideaId: idea.id, userId });
  }

  const [prep] = await db.insert(checklists).values({ tripId: trip.id, title: "Avant le départ" }).returning({ id: checklists.id });
  await db.insert(checklistItems).values(
    [
      ["Vérifier la validité des passeports", "Utile si la destination est hors Union européenne"],
      ["Poser les congés", "Du 13 au 20 février"],
      ["Assurance voyage", ""],
    ].map(([label, hint], position) => ({ checklistId: prep.id, label, hint: hint || null, position })),
  );
  console.log(`« ${title} » créé`);
}

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error("Usage : pnpm seed:demo <email>");
  process.exit(1);
}
const [owner] = await db.select().from(user).where(eq(user.email, email));
if (!owner) {
  console.error(`Aucun compte pour ${email} : créez-le d'abord dans l'application.`);
  process.exit(1);
}
await seedInternship(owner.id);
await seedFebruary(owner.id);
process.exit(0);
