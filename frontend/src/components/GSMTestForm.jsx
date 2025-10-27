import React, { useState } from 'react';

const GSMTestForm = () => {
  const [formData, setFormData] = useState({
    craneId: 'TC-001',
    name: 'Test Crane',
    location: 'Test Site',
    swl: '50',
    city: 'Mumbai',
    siteAddress: 'Test Address',
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    accuracy: '150',
    method: 'gsm'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
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
      // Always add GSM location data
      method: 'gsm',
      accuracy: parseFloat(formData.accuracy) || 150
    };

    console.log('📡 GSM Data being sent to backend:', submitData);
    alert('Check console for GSM data structure!');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">GSM Crane Test Form</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Crane ID</label>
          <input
            type="text"
            value={formData.craneId}
            onChange={(e) => setFormData({...formData, craneId: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Crane Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <select
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Chennai">Chennai</option>
          </select>
        </div>

        <div className="bg-green-50 p-3 rounded border border-green-200">
          <h3 className="font-medium text-green-800 mb-2">📡 GSM Location Settings</h3>
          <div className="text-sm text-green-700">
            <p><strong>Method:</strong> GSM Triangulation (Fixed)</p>
            <p><strong>Accuracy:</strong> {formData.accuracy}m (50-500m typical)</p>
            <p><strong>Note:</strong> GPS coordinates will be provided automatically by GSM module</p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          Test GSM Data Submission
        </button>
      </form>
    </div>
  );
};

export default GSMTestForm;
