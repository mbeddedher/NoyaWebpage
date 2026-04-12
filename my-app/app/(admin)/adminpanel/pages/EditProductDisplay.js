'use client';
import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';
import { BasicDetails, ProductVariants, ProductImages } from './AddProductDisplay';

export default function EditProductDisplay({ id }) {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSection, setCurrentSection] = useState('details');
  
  // Get saved form data or use initial state
  const formData = activeTabId ? getTabFormData(activeTabId) : {
    displayData: null,
    currentSection: 'details'
  };

  const [displayData, setDisplayData] = useState(formData.displayData || null);
  
  // Fetch product display data
  useEffect(() => {
    const fetchProductDisplay = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        
        const response = await fetch(`/api/product-displays/${id}?state=edit`);
        if (!response.ok) {
          throw new Error('Failed to fetch product display');
        }
        
        const data = await response.json();
        console.log('Raw API response for product display:', data);
        console.log('Original variants data:', data.variants);
        console.log('Default size from API:', data.default_size);
        
        // Ensure images array exists and has proper cart image data
        const processedImages = (data.images || []).map(image => {
          // Find matching cart image
          const cartImage = (data.cart_images || []).find(ci => 
            ci.order_index === image.order_index && ci.is_primary === image.is_primary
          );
          
          return {
            ...image,
            cart_url: cartImage?.url,
            cart_dimensions: cartImage ? {
              width: cartImage.width,
              height: cartImage.height
            } : null
          };
        });

        // Process variants to set is_default_size based on default_size
        const processedVariants = (data.variants || []).map(variant => {
          const isDefault = variant.size === data.default_size;
          console.log('Processing variant:', {
            size: variant.size,
            defaultSize: data.default_size,
            isDefault: isDefault
          });
          return {
            ...variant,
            is_default_size: isDefault
          };
        });

        const displayDataToSet = {
          ...data,
          variants: processedVariants,
          images: processedImages,
          keywords: data.keywords || ''  // Ensure keywords is a string
        };
        console.log('Final displayData being set:', displayDataToSet);
        setDisplayData(displayDataToSet);
      } catch (err) {
        console.error('Error fetching product display:', err);
        setError(err.message || 'Failed to fetch product display');
      } finally {
        setInitialLoading(false);
      }
    };

    // Only fetch if we don't have saved data
    if (!formData.displayData) {
      fetchProductDisplay();
    }
  }, [id]);

  // Restore saved section if available
  useEffect(() => {
    if (formData.currentSection) {
      setCurrentSection(formData.currentSection);
    }
  }, []);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !initialLoading) {
      saveTabFormData(activeTabId, {
        displayData,
        currentSection
      });
    }
  }, [displayData, currentSection, activeTabId, initialLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Validate required fields
      if (!displayData.name || !displayData.category_id) {
        alert('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const validateImagesBeforeSubmit = (images = []) => {
        const visible = (images || []).filter((img) => !(img?.hide ?? false));
        const errors = [];

        if (visible.length < 1) errors.push('You must add at least 1 image (not hidden).');

        const inThumb = visible.filter((img) => img?.in_thumb ?? true);
        if (inThumb.length < 1) errors.push('You must select at least 1 image as "In Thumbnail".');

        const primaries = inThumb.filter((img) => !!img?.is_primary);
        if (primaries.length !== 1) errors.push('You must select exactly 1 "Primary Image" among "In Thumbnail" images.');

        const orders = visible.map((img) => Number(img?.order_index)).filter((n) => Number.isFinite(n));
        if (orders.length !== visible.length) {
          errors.push('Every visible image must have a valid numeric Order.');
        } else {
          const ints = orders.map((n) => (Number.isInteger(n) ? n : NaN));
          if (ints.some((n) => !Number.isFinite(n))) errors.push('Order must be an integer.');
          const unique = new Set(ints);
          if (unique.size !== ints.length) errors.push('All visible images must have different Order values.');
          if (ints.length) {
            const min = Math.min(...ints);
            const max = Math.max(...ints);
            if (min !== 1) errors.push('Order must start from 1.');
            if (max !== visible.length) errors.push(`Order must be consecutive up to ${visible.length}.`);
          }
        }

        const invalidPrimary = visible.filter((img) => !!img?.is_primary && !(img?.in_thumb ?? true));
        if (invalidPrimary.length) errors.push('Primary Image must also be "In Thumbnail".');

        return errors;
      };

      const imageErrors = validateImagesBeforeSubmit(displayData.images || []);
      if (imageErrors.length) {
        alert(`Image validation failed:\n\n- ${imageErrors.join('\n- ')}`);
        setLoading(false);
        return;
      }

       // Calculate price range from variants
       let minPrice = null;
       let maxPrice = null;
       let hasVariants = true;
       let priceArray = [];  
 
       if (displayData.variants && displayData.variants.length > 0) {
           if(displayData.variants.length === 1){
             hasVariants = false;
           }
           displayData.variants.forEach(variant => {
             if (!variant.product_id || !variant.price_info) return;
 
           const priceInfo = variant.price_info;
           let variantPrice = null;
 
           // Handle different currency cases
           if (priceInfo.currency === 'MIX' && priceInfo.is_multi && Array.isArray(priceInfo.multi_currency_prices)) {
             // For MIX currency type, sum up all prices converted to TRY
             variantPrice = priceInfo.multi_currency_prices.reduce((total, currencyPrice) => {
               if (currencyPrice.currency === 'TRY') {
                 return total + currencyPrice.price;
               }
               const exchangeRate = priceInfo.exchange_rates?.[currencyPrice.currency];
               if (exchangeRate) {
                 return total + (currencyPrice.price * exchangeRate);
               }
               return total;
             }, 0);
           } else if (priceInfo.currency === 'EUR' || priceInfo.currency === 'USD') {
             // For EUR and USD, convert to TRY using exchange rates
             const exchangeRate = priceInfo.exchange_rates?.[priceInfo.currency];
             if (exchangeRate) {
               variantPrice = priceInfo.price * exchangeRate;
             }
           } else if (priceInfo.currency === 'TRY') {
             // For TRY, use price directly
             variantPrice = priceInfo.price;
           }
 
           if (variantPrice !== null) {
             minPrice = minPrice === null ? variantPrice : Math.min(minPrice, variantPrice);
             maxPrice = maxPrice === null ? variantPrice : Math.max(maxPrice, variantPrice);
           }
           priceArray.push(variantPrice);
         });
 
         if (minPrice !== null && maxPrice !== null) {
           // Format prices with 2 decimal places
           minPrice = parseFloat(minPrice.toFixed(2));
           maxPrice = parseFloat(maxPrice.toFixed(2));
           
           
         }
         
       }


      const submissionData = {
        ...displayData,
        has_variants: hasVariants,
        min_price: minPrice,
        max_price: maxPrice,
        price_array: priceArray,
        default_size: displayData.variants?.find(v => v.is_default_size === true)?.size
      };
      // Validate variants
      if (displayData.variants) {
        const invalidVariant = displayData.variants.find(
          variant => !variant.size && !variant.name
        );
        
        if (invalidVariant) {
          alert('All variants must have either a size or name specified');
          setLoading(false);
          return;
        }
      }

      console.log('Submitting data:', displayData);

      const response = await fetch(`/api/product-displays/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submissionData,
          keywords: submissionData.keywords || ''  // Ensure keywords is a string when sending
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update product display');
      }

      const result = await response.json();
      console.log('Update response:', result);

      if (result.data) {
        // Update the display data with the returned data
        setDisplayData(result.data);
      }

      alert('Product display updated successfully!');
      closeTab(`edit-product-display-${id}`);
    } catch (error) {
      console.error('Error updating product display:', error);
      alert('Failed to update product display. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateImage = (index, field, value) => {
    console.log('Updating image:', { index, field, value });
    const updatedImages = [...displayData.images];
    updatedImages[index] = { ...updatedImages[index], [field]: value };

    console.log('Updated image:', updatedImages[index]);
    setDisplayData({
      ...displayData,
      images: updatedImages
    });
  };

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => closeTab(`edit-product-display-${id}`)}>Close</button>
      </div>
    );
  }

  if (initialLoading && !displayData) {
    return (
      <div className="loading-container">
        <p>Loading product display...</p>
      </div>
    );
  }

  const sections = {
    details: {
      title: 'Basic Details',
      component: <BasicDetails data={displayData} onChange={setDisplayData} />
    },
    variants: {
      title: 'Product Variants',
      component: <ProductVariants data={displayData} onChange={setDisplayData} />
    },
    images: {
      title: 'Product Images',
      component: <ProductImages data={displayData} onChange={setDisplayData} />
    }
  };

  return (
    <AddContentLayout
      title="Edit Product Display"
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Update Product Display"
      onCancel={() => closeTab(`edit-product-display-${id}`)}
    >
      <div className="form-navigation">
        {Object.entries(sections).map(([key, section]) => (
          <button
            key={key}
            className={`nav-button ${currentSection === key ? 'active' : ''}`}
            onClick={() => setCurrentSection(key)}
            type="button"
          >
            {section.title}
          </button>
        ))}
      </div>

      <div className="form-content">
        {sections[currentSection].component}
      </div>
    </AddContentLayout>
  );
} 