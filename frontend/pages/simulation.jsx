import { useState } from 'react';
import { useQuery } from 'react-query';
import { simulationAPI, cranesAPI } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import toast from 'react-hot-toast';

export default function Simulation() {
  const { user } = useAuth();
  const [selectedCrane, setSelectedCrane] = useState('');
  const [payload, setPayload] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: cranesData } = useQuery(
    'cranes',
    () => cranesAPI.getAll({ limit: 100 }),
    {
      enabled: user.role === 'admin' || user.role === 'manager',
    }
  );

  const { data: samplesData } = useQuery(
    'simulation-samples',
    () => simulationAPI.getSamples(),
    {
      enabled: user.role === 'admin' || user.role === 'manager',
    }
  );

  const cranes = cranesData?.data?.cranes || [];
  const samples = samplesData?.data?.samples || {};

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!selectedCrane || !payload) {
      toast.error('Please select a crane and enter a payload');
      return;
    }

    setIsPublishing(true);
    try {
      await simulationAPI.publish({
        craneId: selectedCrane,
        payload: payload,
      });
      toast.success('Payload published successfully!');
    } catch (error) {
      toast.error('Failed to publish payload');
    } finally {
      setIsPublishing(false);
    }
  };

  const loadSample = (sampleType) => {
    if (samples[sampleType]) {
      setPayload(samples[sampleType].format);
    }
  };

  const generateRandomPayload = () => {
    const crane = cranes.find(c => c.craneId === selectedCrane);
    if (!crane) return;

    const load = Math.floor(Math.random() * crane.swl * 1.2);
    const util = Math.floor((load / crane.swl) * 100);
    const timestamp = new Date().toISOString();
    
    const formats = [
      `TS=${timestamp};ID=${selectedCrane};LOAD=${load};SWL=${crane.swl};LS1=OK;LS2=OK;LS3=OK;UT=OK;UTIL=${util}`,
      `${selectedCrane}|${timestamp}|LOAD:${load}|SWL:${crane.swl}|LS1:OK|LS2:OK|LS3:OK|UT:OK|UTIL:${util}`,
      JSON.stringify({
        id: selectedCrane,
        ts: timestamp,
        load: load,
        swl: crane.swl,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: util
      })
    ];
    
    setPayload(formats[Math.floor(Math.random() * formats.length)]);
  };

  if (user.role !== 'admin' && user.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simulation</h1>
        <p className="text-gray-600">Test MQTT payload publishing and system behavior</p>
      </div>

      {/* Publish Form */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Publish Test Payload</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handlePublish} className="space-y-4">
            <div>
              <label className="form-label">Select Crane</label>
              <select
                className="form-input"
                value={selectedCrane}
                onChange={(e) => setSelectedCrane(e.target.value)}
                required
              >
                <option value="">Choose a crane...</option>
                {cranes.map((crane) => (
                  <option key={crane.craneId} value={crane.craneId}>
                    {crane.craneId} - {crane.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Payload</label>
              <textarea
                className="form-input h-32"
                placeholder="Enter MQTT payload..."
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isPublishing || !selectedCrane || !payload}
                className="btn-primary"
              >
                {isPublishing ? 'Publishing...' : 'Publish Payload'}
              </button>
              
              <button
                type="button"
                onClick={generateRandomPayload}
                disabled={!selectedCrane}
                className="btn-outline"
              >
                Generate Random
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sample Payloads */}
      {samples && Object.keys(samples).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Sample Payloads</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {Object.entries(samples).map(([key, sample]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <button
                      onClick={() => loadSample(key)}
                      className="btn-outline text-xs px-3 py-1"
                    >
                      Use
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{sample.description}</p>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <code className="text-xs text-gray-800 break-all">
                      {sample.format}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Instructions</h3>
        </div>
        <div className="card-body">
          <div className="prose prose-sm max-w-none">
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Select a crane from the dropdown to target your test payload</li>
              <li>Use the sample payloads above or create your own custom payload</li>
              <li>Click "Generate Random" to create a random payload for the selected crane</li>
              <li>Click "Publish Payload" to send the payload to the MQTT broker</li>
              <li>Monitor the dashboard to see real-time updates from your test data</li>
              <li>Check the tickets page for any alerts generated by your test payload</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
