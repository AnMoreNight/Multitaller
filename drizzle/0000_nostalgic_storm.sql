CREATE TYPE "public"."business_type" AS ENUM('mechanical_workshop');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('Pendiente inspección', 'Esperando repuesto', 'En proceso', 'Completado', 'Entregado', 'Garantía');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('system_admin', 'admin', 'worker');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "labor_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "part_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" text NOT NULL,
	"part_id" uuid,
	"name" text NOT NULL,
	"workshop_cost" numeric(10, 2) NOT NULL,
	"customer_price" numeric(10, 2) NOT NULL,
	"warranty" boolean DEFAULT false NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"sku" text,
	"name" text NOT NULL,
	"workshop_cost" numeric(10, 2) NOT NULL,
	"customer_price" numeric(10, 2) NOT NULL,
	"warranty" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"role" "role" NOT NULL,
	"can_change_order_status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workshop_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vin" text,
	"plate" text,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"color" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"workshop_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"created_at" text NOT NULL,
	"reason" text NOT NULL,
	"warning_lights" text[] DEFAULT '{}'::text[] NOT NULL,
	"complaint" text,
	"status" "order_status" NOT NULL,
	"diagnosis_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"diagnosis_waived" boolean DEFAULT false NOT NULL,
	"apply_materials_fee" boolean DEFAULT false NOT NULL,
	"warranty_of" text
);
--> statement-breakpoint
CREATE TABLE "workshops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"business_type" "business_type" DEFAULT 'mechanical_workshop' NOT NULL,
	"next_order_seq" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labor_items" ADD CONSTRAINT "labor_items_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_lines" ADD CONSTRAINT "part_lines_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "part_lines" ADD CONSTRAINT "part_lines_part_id_parts_catalog_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_catalog" ADD CONSTRAINT "parts_catalog_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_warranty_of_work_orders_id_fk" FOREIGN KEY ("warranty_of") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_workshop_id_idx" ON "customers" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "labor_items_work_order_id_idx" ON "labor_items" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "part_lines_work_order_id_idx" ON "part_lines" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "parts_catalog_workshop_id_idx" ON "parts_catalog" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_workshop_id_idx" ON "users" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "vehicles_workshop_id_idx" ON "vehicles" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "vehicles_customer_id_idx" ON "vehicles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "work_orders_workshop_id_idx" ON "work_orders" USING btree ("workshop_id");--> statement-breakpoint
CREATE INDEX "work_orders_customer_id_idx" ON "work_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "work_orders_vehicle_id_idx" ON "work_orders" USING btree ("vehicle_id");