CREATE TYPE "public"."cost_category" AS ENUM('vol', 'logement', 'transport', 'activites', 'repas', 'autre');--> statement-breakpoint
CREATE TYPE "public"."cost_unit" AS ENUM('groupe', 'personne', 'nuit', 'jour', 'personne_jour');--> statement-breakpoint
CREATE TABLE "idea_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"category" "cost_category" NOT NULL,
	"label" text,
	"min_amount" integer NOT NULL,
	"max_amount" integer NOT NULL,
	"unit" "cost_unit" NOT NULL,
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "destination_ideas" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "travelers" integer;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "nights" integer;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "chosen_idea_id" uuid;--> statement-breakpoint
ALTER TABLE "idea_costs" ADD CONSTRAINT "idea_costs_idea_id_destination_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."destination_ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_costs_idea_idx" ON "idea_costs" USING btree ("idea_id");--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_chosen_idea_id_destination_ideas_id_fk" FOREIGN KEY ("chosen_idea_id") REFERENCES "public"."destination_ideas"("id") ON DELETE set null ON UPDATE no action;