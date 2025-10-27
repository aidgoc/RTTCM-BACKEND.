const express = require('express');
const mqttClient = require('../mqttClient');
const { requireSimulationAccess } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/sim/publish
 * Publish test MQTT payload (admin/manager only)
 */
router.post('/publish', requireSimulationAccess, async (req, res) => {
  try {
    const { craneId, payload, topic } = req.body;

    // Validate input
    if (!craneId || !payload) {
      return res.status(400).json({ 
        error: 'Crane ID and payload are required' 
      });
    }

    // Determine topic
    const mqttTopic = topic || `crane/${craneId}/telemetry`;
    
    // Publish to MQTT
    const success = mqttClient.publish(mqttTopic, payload);
    
    if (!success) {
      return res.status(503).json({ 
        error: 'MQTT client not connected' 
      });
    }

    res.json({
      message: 'Payload published successfully',
      craneId,
      topic: mqttTopic,
      payload
    });
  } catch (error) {
    console.error('Publish simulation error:', error);
    res.status(500).json({ error: 'Failed to publish payload' });
  }
});

/**
 * POST /api/sim/publish/batch
 * Publish multiple test payloads (admin/manager only)
 */
router.post('/publish/batch', requireSimulationAccess, async (req, res) => {
  try {
    const { payloads } = req.body;

    if (!Array.isArray(payloads) || payloads.length === 0) {
      return res.status(400).json({ 
        error: 'Payloads array is required and must not be empty' 
      });
    }

    const results = [];
    let successCount = 0;

    for (const payloadData of payloads) {
      const { craneId, payload, topic } = payloadData;
      
      if (!craneId || !payload) {
        results.push({
          craneId: craneId || 'unknown',
          success: false,
          error: 'Crane ID and payload are required'
        });
        continue;
      }

      const mqttTopic = topic || `crane/${craneId}/telemetry`;
      const success = mqttClient.publish(mqttTopic, payload);
      
      results.push({
        craneId,
        topic: mqttTopic,
        success,
        error: success ? null : 'MQTT client not connected'
      });

      if (success) successCount++;
    }

    res.json({
      message: `Published ${successCount}/${payloads.length} payloads successfully`,
      results,
      successCount,
      totalCount: payloads.length
    });
  } catch (error) {
    console.error('Publish batch simulation error:', error);
    res.status(500).json({ error: 'Failed to publish batch payloads' });
  }
});

/**
 * GET /api/sim/samples
 * Get sample payload formats (admin/manager only)
 */
router.get('/samples', requireSimulationAccess, (req, res) => {
  const samples = {
    semicolonDelimited: {
      format: 'TS=2025-09-09T12:05:10Z;ID=TC-004;LOAD=120;SWL=100;LS1=OK;LS2=OK;LS3=OK;UT=OK;UTIL=92',
      description: 'Semicolon-delimited format with key=value pairs'
    },
    pipeDelimited: {
      format: 'TC-001|2025-09-09T12:06:00Z|LOAD:85|SWL:100|LS1:OK|LS2:OK|LS3:FAIL|UT:OK|UTIL:78',
      description: 'Pipe-delimited format with ID|timestamp|key:value pairs'
    },
    json: {
      format: '{"id":"TC-002","ts":"2025-09-09T12:07:00Z","load":45,"swl":80,"ls1":"OK","ls2":"OK","ls3":"OK","ut":"OK","util":56}',
      description: 'JSON format with standard field names'
    },
    overloadExample: {
      format: 'TS=2025-09-09T12:08:00Z;ID=TC-003;LOAD=150;SWL=100;LS1=OK;LS2=OK;LS3=OK;UT=OK;UTIL=95',
      description: 'Example of overload condition (load > SWL)'
    },
    limitSwitchFailure: {
      format: 'TC-004|2025-09-09T12:09:00Z|LOAD:75|SWL:100|LS1:FAIL|LS2:OK|LS3:OK|UT:OK|UTIL:75',
      description: 'Example of limit switch failure'
    },
    highUtilization: {
      format: '{"id":"TC-005","ts":"2025-09-09T12:10:00Z","load":90,"swl":100,"ls1":"OK","ls2":"OK","ls3":"OK","ut":"OK","util":98}',
      description: 'Example of high utilization (>95%)'
    }
  };

  res.json({
    message: 'Sample payload formats for testing',
    samples,
    usage: {
      endpoint: 'POST /api/sim/publish',
      body: {
        craneId: 'TC-001',
        payload: 'your-payload-string',
        topic: 'crane/TC-001/telemetry' // optional
      }
    }
  });
});

/**
 * POST /api/sim/generate
 * Generate random test data for a crane (admin/manager only)
 */
router.post('/generate', requireSimulationAccess, async (req, res) => {
  try {
    const { craneId, count = 10, interval = 1000 } = req.body;

    if (!craneId) {
      return res.status(400).json({ 
        error: 'Crane ID is required' 
      });
    }

    const results = [];
    const baseTime = new Date();

    for (let i = 0; i < count; i++) {
      // Generate random telemetry data
      const load = Math.floor(Math.random() * 120) + 20; // 20-140
      const swl = 100;
      const util = Math.floor((load / swl) * 100);
      
      const ls1 = Math.random() > 0.9 ? 'FAIL' : 'OK';
      const ls2 = Math.random() > 0.95 ? 'FAIL' : 'OK';
      const ls3 = Math.random() > 0.9 ? 'FAIL' : 'OK';
      const ut = Math.random() > 0.95 ? 'FAIL' : 'OK';

      const timestamp = new Date(baseTime.getTime() + i * interval);
      const ts = timestamp.toISOString();

      // Randomly choose format
      const format = Math.floor(Math.random() * 3);
      let payload;

      switch (format) {
        case 0: // Semicolon format
          payload = `TS=${ts};ID=${craneId};LOAD=${load};SWL=${swl};LS1=${ls1};LS2=${ls2};LS3=${ls3};UT=${ut};UTIL=${util}`;
          break;
        case 1: // Pipe format
          payload = `${craneId}|${ts}|LOAD:${load}|SWL:${swl}|LS1:${ls1}|LS2:${ls2}|LS3:${ls3}|UT:${ut}|UTIL:${util}`;
          break;
        case 2: // JSON format
          payload = JSON.stringify({
            id: craneId,
            ts: ts,
            load: load,
            swl: swl,
            ls1: ls1,
            ls2: ls2,
            ls3: ls3,
            ut: ut,
            util: util
          });
          break;
      }

      // Publish with delay
      setTimeout(() => {
        mqttClient.publish(`crane/${craneId}/telemetry`, payload);
      }, i * interval);

      results.push({
        index: i,
        timestamp: ts,
        payload,
        data: { load, swl, util, ls1, ls2, ls3, ut }
      });
    }

    res.json({
      message: `Generated ${count} test payloads for crane ${craneId}`,
      craneId,
      count,
      interval,
      results
    });
  } catch (error) {
    console.error('Generate simulation error:', error);
    res.status(500).json({ error: 'Failed to generate test data' });
  }
});

module.exports = router;
