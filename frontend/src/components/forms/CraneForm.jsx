import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';

const CraneForm = ({ onSubmit, onCancel, initialData = null, isEditing = false }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    craneId: initialData?.craneId || '',
    name: initialData?.name || '',
    location: initialData?.location || '',
    swl: initialData?.swl || '',
    model: initialData?.specifications?.model || '',
    manufacturer: initialData?.specifications?.manufacturer || '',
    // Location fields - only city for manual entry
    city: initialData?.locationData?.city || '',
    siteAddress: initialData?.locationData?.siteAddress || '',
    // GSM will provide coordinates automatically via MQTT
    method: 'gsm' // GSM will provide location data
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // City options
  const cityOptions = [
    'HUBBALI-DHARWAD',
    'GADAG', 
    'BENGALURU',
    'MUMBAI',
    'DELHI',
    'CHENNAI',
    'KOLKATA',
    'HYDERABAD',
    'PUNE',
    'AHMEDABAD',
    'JAIPUR'
  ];

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.craneId.trim()) newErrors.craneId = 'Crane ID is required';
    if (!formData.name.trim()) newErrors.name = 'Crane name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.swl || formData.swl <= 0) newErrors.swl = 'SWL must be greater than 0';
    if (!formData.city) newErrors.city = 'City is required';
    
    // GSM location validation - no manual coordinates needed
    // GPS coordinates will be provided automatically by GSM module
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submitData = {
        craneId: formData.craneId.trim(),
        name: formData.name.trim(),
        location: formData.location.trim(),
        swl: parseFloat(formData.swl),
        city: formData.city,
        siteAddress: formData.siteAddress.trim(),
        specifications: {
          model: formData.model.trim(),
          manufacturer: formData.manufacturer.trim()
        },
        // GSM will provide GPS coordinates via MQTT
        method: 'gsm',
        accuracy: 150 // Default GSM accuracy
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isEditing ? 'Edit Crane' : 'Add New Crane'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {isEditing ? 'Update crane information and location' : 'Create a new crane with GSM location tracking'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Crane ID *
            </label>
            <input
              type="text"
              name="craneId"
              value={formData.craneId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.craneId ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="TC-001"
              disabled={isEditing}
            />
            {errors.craneId && <p className="text-red-500 text-sm mt-1">{errors.craneId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Crane Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tower Crane 1"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Construction Site A - North Wing"
            />
            {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SWL (kg) *
            </label>
            <input
              type="number"
              name="swl"
              value={formData.swl}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.swl ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="50000"
              min="1"
              max="100000"
            />
            {errors.swl && <p className="text-red-500 text-sm mt-1">{errors.swl}</p>}
          </div>
        </div>

        {/* Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Model
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="TC-5013"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Manufacturer
            </label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Liebherr"
            />
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              City *
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select City</option>
              {cityOptions.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Address
            </label>
            <input
              type="text"
              name="siteAddress"
              value={formData.siteAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="123 Main Street, Industrial Area"
            />
          </div>

        </div>

        {/* GSM Location Tracking Section */}
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mr-3">
              <span className="text-green-600 dark:text-green-400 text-lg">📡</span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-green-900 dark:text-green-100">
                GSM Location Tracking
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Crane location will be automatically tracked via GSM triangulation
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>How it works:</strong> The crane's GSM module will automatically connect to nearby cell towers 
              and provide GPS coordinates to your backend system via MQTT. No manual coordinate entry required.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              📍 The system will use the selected city as a fallback location until GSM data is received.
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Crane' : 'Create Crane')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CraneForm;