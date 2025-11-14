/**
 * Convert a raw MQTT topic and payload into the backend topic format.
 * Expected output: company/{companyName}/crane/{craneId}/telemetry
 */
function convertRawTopic(rawTopic, payload) {
  try {
    if (typeof rawTopic !== 'string' || typeof payload !== 'string') {
      throw new Error('Invalid input types');
    }

    const [imei] = rawTopic.split('/');
    if (!imei) {
      throw new Error('Missing IMEI in topic');
    }

    const imeiToCompanyMap = {
      '868019064209266': 'SOBHA-CRANES'
      // Extend this mapping as new IMEIs are provisioned.
    };
    const companyName = imeiToCompanyMap[imei] || 'UNKNOWN';

    let craneId = 'UNKNOWN';
    const dmIndex = payload.indexOf('$DM');
    if (dmIndex !== -1) {
      const startIndex = dmIndex + 3;
      const candidate = payload.slice(startIndex, startIndex + 4);
      if (candidate && candidate.length === 4) {
        craneId = candidate.toUpperCase();
      }
    }

    const convertedTopic = `company/${companyName}/crane/${craneId}/telemetry`;

    console.log('📥 Raw Topic:', rawTopic);
    console.log('💾 Payload:', payload);
    console.log('🔄 Converted Topic:', convertedTopic);

    return convertedTopic;
  } catch (error) {
    const fallbackTopic = 'company/UNKNOWN/crane/UNKNOWN/telemetry';
    console.error('convertRawTopic error:', error.message);
    console.log('📥 Raw Topic:', rawTopic);
    console.log('💾 Payload:', payload);
    console.log('🔄 Converted Topic:', fallbackTopic);
    return fallbackTopic;
  }
}

module.exports = {
  convertRawTopic
};

