-- CreateEnum
CREATE TYPE "differece_type_enum" AS ENUM ('discount', 'profit');

-- CreateEnum
CREATE TYPE "display_status_type" AS ENUM ('active', 'diactive');

-- CreateEnum
CREATE TYPE "image_type" AS ENUM ('thumbnail', 'gallery', 'zoomed');

-- CreateEnum
CREATE TYPE "link_type_enum" AS ENUM ('cost', 'cost-vat', 'price', 'manual');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'canceled', 'returned');

-- CreateEnum
CREATE TYPE "package_option_status_type" AS ENUM ('active', 'not active', 'out of stock');

-- CreateEnum
CREATE TYPE "package_option_stock_status_type" AS ENUM ('divide', 'seperate', 'infinite');

-- CreateEnum
CREATE TYPE "stock_arrival_interval_type" AS ENUM ('interval', 'weeky', 'monthly', 'date', 'inhereted', 'unknown');

-- CreateEnum
CREATE TYPE "stock_status_type" AS ENUM ('limited', 'unlimited', 'locked', 'infinite');

-- CreateEnum
CREATE TYPE "unit_type" AS ENUM ('m', 'cm', 'mm', 'inch', 'm2', 'kg', 'g', 'piece', 'pack');

-- CreateEnum
CREATE TYPE "user_role_type" AS ENUM ('admin', 'customer', 'servicer', 'guest');

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "content" TEXT NOT NULL,
    "star" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crafted_products" (
    "id" SERIAL NOT NULL,
    "parent_product_id" INTEGER NOT NULL,
    "component_product_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "converted_currency" VARCHAR(3),

    CONSTRAINT "crafted_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_rates" (
    "id" SERIAL NOT NULL,
    "from_currency" VARCHAR(3) NOT NULL,
    "to_currency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(20,6) NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "display_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "display_type" "image_type" NOT NULL DEFAULT 'gallery',
    "alt_text" VARCHAR(255),
    "order_index" INTEGER DEFAULT 0,
    "file_size" INTEGER,
    "resolution" VARCHAR(50),
    "format" VARCHAR(10),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linked_prices" (
    "id" SERIAL NOT NULL,
    "parent_product_id" INTEGER NOT NULL,
    "component_product_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "currency" VARCHAR(3),

    CONSTRAINT "linked_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multi_currency_prices" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "price" DECIMAL(20,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "multi_currency_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) DEFAULT ((quantity)::numeric * price),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "order_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "status" "order_status" DEFAULT 'pending',
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "payment_method" VARCHAR(50),
    "shipping_address_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_options" (
    "id" SERIAL NOT NULL,
    "status" "package_option_status_type" NOT NULL DEFAULT 'active',
    "product_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "discount" DECIMAL(4,2) DEFAULT 0,
    "stock_status" "package_option_stock_status_type" NOT NULL DEFAULT 'divide',
    "name" VARCHAR(50),
    "order_index" INTEGER,

    CONSTRAINT "package_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "is_component" BOOLEAN DEFAULT false,
    "cost" DECIMAL(10,2) NOT NULL,
    "vat" DECIMAL(5,2) NOT NULL,
    "profit" DECIMAL(5,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "supplier_discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "has_difference" BOOLEAN DEFAULT false,
    "is_multi" BOOLEAN DEFAULT false,
    "difference_type" VARCHAR(20),
    "difference_value" DECIMAL(10,2),
    "link_type" "link_type_enum",
    "is_linked" BOOLEAN DEFAULT false,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_display" (
    "id" SERIAL NOT NULL,
    "status" "display_status_type" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(255),
    "ranking" DECIMAL(3,2) DEFAULT 0,
    "description" JSONB,
    "has_variants" BOOLEAN DEFAULT false,
    "category_id" INTEGER NOT NULL,
    "keywords" TEXT[],
    "size_array" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "popularity_score" DOUBLE PRECISION DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_display_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "display_id" INTEGER NOT NULL,
    "size" VARCHAR(50) NOT NULL,
    "has_package_options" BOOLEAN DEFAULT true,
    "order_index" INTEGER NOT NULL,
    "status" "package_option_status_type" DEFAULT 'active',

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "is_onsite" BOOLEAN DEFAULT false,
    "is_crafted" BOOLEAN DEFAULT false,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "brand" VARCHAR(50) NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "dimensions" VARCHAR(50),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "stock_status" "stock_status_type" DEFAULT 'limited',
    "quantity" INTEGER DEFAULT 0,
    "unit" "unit_type" NOT NULL,
    "min_stock" INTEGER,
    "package_quantity" INTEGER DEFAULT 1,
    "is_linked" BOOLEAN DEFAULT false,
    "is_component" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "arrival_date" VARCHAR(50),
    "arrival_type" "stock_arrival_interval_type" DEFAULT 'unknown',

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_name" VARCHAR(255),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "website" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "state" VARCHAR(50),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(50) NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone_number" VARCHAR(20),
    "is_active" BOOLEAN DEFAULT true,
    "role" "user_role_type" NOT NULL DEFAULT 'customer',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_images" (
    "id" SERIAL NOT NULL,
    "display_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "format" VARCHAR(10),
    "is_primary" BOOLEAN DEFAULT false,
    "order_index" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_currency_rates_currencies" ON "currency_rates"("from_currency", "to_currency");

-- CreateIndex
CREATE INDEX "idx_currency_rates_date" ON "currency_rates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "currency_rates_from_currency_to_currency_date_key" ON "currency_rates"("from_currency", "to_currency", "date");

-- CreateIndex
CREATE UNIQUE INDEX "multi_currency_prices_product_id_currency_key" ON "multi_currency_prices"("product_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_size_key" ON "product_variants"("product_id", "size");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "fk_parent_category" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "fk_comment_parent" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "fk_comment_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "fk_comment_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crafted_products" ADD CONSTRAINT "fk_component_product" FOREIGN KEY ("component_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "crafted_products" ADD CONSTRAINT "fk_parent_product" FOREIGN KEY ("parent_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "fk_display_image" FOREIGN KEY ("display_id") REFERENCES "product_display"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "linked_prices" ADD CONSTRAINT "fk_component_product" FOREIGN KEY ("component_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "linked_prices" ADD CONSTRAINT "fk_parent_product" FOREIGN KEY ("parent_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "multi_currency_prices" ADD CONSTRAINT "multi_currency_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_item_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_item_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "fk_order_address" FOREIGN KEY ("shipping_address_id") REFERENCES "user_addresses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "fk_order_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "package_options" ADD CONSTRAINT "package_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "fk_product_price" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_display" ADD CONSTRAINT "product_display_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "web_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_display_id_fkey" FOREIGN KEY ("display_id") REFERENCES "product_display"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "fk_product_stock" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "fk_user_address" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "web_categories" ADD CONSTRAINT "fk_parent_category" FOREIGN KEY ("parent_id") REFERENCES "web_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cart_images" ADD CONSTRAINT "cart_images_display_id_fkey" FOREIGN KEY ("display_id") REFERENCES "product_display"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
