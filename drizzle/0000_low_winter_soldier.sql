CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text,
	"status" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
