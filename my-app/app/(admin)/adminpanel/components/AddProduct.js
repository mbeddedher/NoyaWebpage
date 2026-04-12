'use client';
import { useState, useEffect } from 'react';

export default function AddProduct() {
  const [product, setProduct] = useState({
    name: '',
    sku: '',
    brand: '',
    dimensions: '',
    category_id: '',
    supplier_id: '',
    is_active: true
  });

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, suppliersRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/suppliers')
        ]);

        if (!categoriesRes.ok || !suppliersRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [categoriesData, suppliersData] = await Promise.all([
          categoriesRes.json(),
          suppliersRes.json()
        ]);

        setCategories(categoriesData);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        throw new Error('Failed to add product');
      }

      // Clear form after successful submission
      setProduct({
        name: '',
        sku: '',
        brand: '',
        dimensions: '',
        category_id: '',
        supplier_id: '',
        is_active: true
      });

      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="add-product">
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label htmlFor="name">Product Name</label>
          <input
            type="text"
            id="name"
            value={product.name}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="sku">SKU</label>
          <input
            type="text"
            id="sku"
            value={product.sku}
            onChange={(e) => setProduct({ ...product, sku: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="brand">Brand</label>
          <input
            type="text"
            id="brand"
            value={product.brand}
            onChange={(e) => setProduct({ ...product, brand: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="dimensions">Dimensions</label>
          <input
            type="text"
            id="dimensions"
            value={product.dimensions}
            onChange={(e) => setProduct({ ...product, dimensions: e.target.value })}
            placeholder="e.g., 10x20x30 cm"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={product.category_id}
            onChange={(e) => setProduct({ ...product, category_id: Number(e.target.value) })}
            required
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="supplier">Supplier</label>
          <select
            id="supplier"
            value={product.supplier_id}
            onChange={(e) => setProduct({ ...product, supplier_id: Number(e.target.value) })}
            required
          >
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group-checkboxes">
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="is_active"
              checked={product.is_active}
              onChange={(e) => setProduct({ ...product, is_active: e.target.checked })}
            />
            <label htmlFor="is_active">Active</label>
          </div>
        </div>

        <button type="submit" className="submit-button">
          Add Product
        </button>
      </form>
    </div>
  );
} 