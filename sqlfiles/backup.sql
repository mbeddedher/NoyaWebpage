-- First create all ENUM types
CREATE TYPE unit_type AS ENUM ('m', 'cm', 'mm', 'inch', 'm2', 'kg', 'g', 'piece', 'pack');
CREATE TYPE stock_status_type AS ENUM ('limited', 'unlimited', 'locked', 'infinite');
CREATE TYPE stock_arrival_interval_type AS ENUM ('interval', 'weeky', 'monthly', 'date', 'inhereted', 'unknown');
CREATE TYPE package_option_status_type AS ENUM ('active', 'not active', 'out of stock');
CREATE TYPE package_option_stock_status_type AS ENUM ('divide', 'seperate', 'infinite');
CREATE TYPE user_role_type AS ENUM ('admin', 'customer', 'servicer', 'guest');
CREATE TYPE display_status_type AS ENUM ('active', 'diactive');
CREATE TYPE link_type_enum AS ENUM ('cost', 'price', 'manual');
CREATE TYPE image_type AS ENUM ('thumbnail', 'gallery', 'zoomed');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'canceled', 'returned');
CREATE TYPE differece_type_enum AS ENUM ('discount', 'profit');

-- Create base tables without foreign key constraints first
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE web_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(255),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    role user_role_type NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

-- Add self-referencing foreign keys
ALTER TABLE categories 
ADD CONSTRAINT fk_parent_category 
FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE web_categories 
ADD CONSTRAINT fk_parent_category 
FOREIGN KEY (parent_id) REFERENCES web_categories(id) ON DELETE SET NULL;

-- Create tables that depend on base tables
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT true,
    is_onsite BOOLEAN DEFAULT false,
    is_crafted BOOLEAN DEFAULT false,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    brand VARCHAR(50) NOT NULL,
    supplier_id INT NOT NULL,
    dimensions VARCHAR(50),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE product_display (
    id SERIAL PRIMARY KEY,
    status display_status_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    ranking DECIMAL(3,2) DEFAULT 0,
    description JSONB,
    has_variants BOOLEAN DEFAULT false,
    category_id INTEGER NOT NULL,
    keywords TEXT[],
    size_array TEXT[] DEFAULT ARRAY[]::TEXT[],
    popularity_score FLOAT DEFAULT 0,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES web_categories(id) ON DELETE SET NULL
);

CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    stock_status stock_status_type DEFAULT 'limited',
    quantity INT DEFAULT 0,
    unit unit_type NOT NULL,
    min_stock INT,
    package_quantity INT DEFAULT 1,
    is_linked BOOLEAN DEFAULT false,
    is_component BOOLEAN DEFAULT false,
    arrival_type stock_arrival_interval_type DEFAULT 'unknown',
    arrival_date VARCHAR(50),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE prices (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    is_component BOOLEAN DEFAULT false,
    cost DECIMAL(10,2) NOT NULL,
    vat DECIMAL(5,2) NOT NULL,
    profit DECIMAL(5,2) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    supplier_discount DECIMAL(5,2) DEFAULT 0,
    has_difference BOOLEAN DEFAULT false,
    is_multi BOOLEAN DEFAULT false,
    difference_type VARCHAR(20),
    difference_value DECIMAL(10,2),
    link_type link_type_enum,
    is_linked BOOLEAN DEFAULT false,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    display_id INT NOT NULL,
    size VARCHAR(50) NOT NULL,
    has_package_options BOOLEAN DEFAULT true,
    order_index INT NOT NULL,
    status package_option_status_type DEFAULT 'active',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (display_id) REFERENCES product_display(id) ON DELETE CASCADE,
    UNIQUE (product_id, size)
);

CREATE TABLE package_options (
    id SERIAL PRIMARY KEY,
    status package_option_status_type NOT NULL DEFAULT 'active',
    product_id INT NOT NULL,
    count INT NOT NULL,
    discount DECIMAL(4,2) DEFAULT 0,
    stock_status package_option_stock_status_type NOT NULL DEFAULT 'divide',
    name VARCHAR(50),
    order_index INT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    display_id INT NOT NULL,
    url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    display_type image_type NOT NULL DEFAULT 'gallery',
    alt_text VARCHAR(255),
    order_index INT DEFAULT 0,
    file_size INT,
    resolution VARCHAR(50),
    format VARCHAR(10),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (display_id) REFERENCES product_display(id) ON DELETE CASCADE
);

CREATE TABLE cart_images (
    id SERIAL PRIMARY KEY,
    display_id INT NOT NULL,
    url TEXT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    format VARCHAR(10),
    is_primary BOOLEAN DEFAULT false,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (display_id) REFERENCES product_display(id) ON DELETE CASCADE
);

CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    status order_status DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    payment_method VARCHAR(50),
    shipping_address_id INT NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shipping_address_id) REFERENCES user_addresses(id) ON DELETE CASCADE
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE crafted_products (
    id SERIAL PRIMARY KEY,
    parent_product_id INT NOT NULL,
    component_product_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    converted_currency VARCHAR(3),
    FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE linked_prices (
    id SERIAL PRIMARY KEY,
    parent_product_id INT NOT NULL,
    component_product_id INT NOT NULL,
    link_type link_type_enum NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE currency_rates (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(20,6) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency, date)
);

CREATE TABLE multi_currency_prices (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    price DECIMAL(20,2) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, currency)
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT,
    content TEXT NOT NULL,
    star INT CHECK (star BETWEEN 1 AND 5),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_currency_rates_date ON currency_rates(date);
CREATE INDEX idx_currency_rates_currencies ON currency_rates(from_currency, to_currency);

-- Create views
CREATE OR REPLACE VIEW cart_product_view AS
SELECT 
    pd.id AS product_id,
    pd.name AS product_name,
    pd.size_array,
    pd.brand,
    (SELECT ci.url 
     FROM cart_images ci 
     WHERE ci.display_id = pd.id AND ci.is_primary = TRUE 
     LIMIT 1) AS primary_image_url,
    (
        SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'size', pv.size,
                'stock_status', s.stock_status,
                'quantity', s.quantity,
                'price', p.price,
                'currency', p.currency,
                'discount', p.discount
            )
        )
        FROM product_variants pv
        LEFT JOIN stocks s ON pv.product_id = s.product_id
        LEFT JOIN prices p ON pv.product_id = p.product_id
        WHERE pv.display_id = pd.id
    ) as variants
FROM product_display pd
WHERE pd.status = 'active';

CREATE OR REPLACE VIEW product_landing_view AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.description,
    p.brand AS product_brand,
    c.name AS category_name,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'variant_id', v.id,
            'variant_size', v.size,
            'variant_price', pr.price,
            'variant_discount', pr.discount,
            'variant_currency', pr.currency,
            'is_multi', pr.is_multi,
            'variant_order_index', v.order_index,
            'has_package_options', v.has_package_options,
            'variant_status', v.status,
            'stock_status', st.stock_status,
            'quantity', st.quantity,
            'unit', st.unit,
            'min_stock', st.min_stock,
            'arrival_date', st.arrival_date,
            'arrival_type', st.arrival_type,
            'package_options', CASE 
                WHEN v.has_package_options THEN (
                    SELECT JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'package_status', po.status,
                            'package_count', po.count,
                            'package_discount', po.discount,
                            'package_stock_status', po.stock_status,
                            'package_order_index', po.order_index,
                            'package_name', po.name
                        )
                    )
                    FROM package_options po
                    WHERE po.product_id = v.product_id
                    AND po.status != 'not active'
                )
                ELSE NULL
            END
        )
    ) AS variants
FROM 
    product_display p
LEFT JOIN web_categories c ON p.category_id = c.id
LEFT JOIN product_variants v ON p.id = v.display_id AND v.status != 'not active'
LEFT JOIN prices pr ON v.product_id = pr.product_id
LEFT JOIN stocks st ON v.product_id = st.product_id
WHERE p.status = 'active'
GROUP BY p.id, c.name; 