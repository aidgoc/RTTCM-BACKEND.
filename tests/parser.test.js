const { parseTelemetryPayload, validateTelemetryData, normalizeTelemetryData } = require('../src/utils/parser');

describe('Telemetry Parser', () => {
  describe('parseTelemetryPayload', () => {
    test('should parse semicolon-delimited format', () => {
      const payload = 'TS=2025-09-09T12:05:10Z;ID=TC-004;LOAD=120;SWL=100;LS1=OK;LS2=OK;LS3=OK;UT=OK;UTIL=92';
      const result = parseTelemetryPayload(payload);
      
      expect(result).toEqual({
        craneId: 'TC-004',
        ts: '2025-09-09T12:05:10Z',
        load: 120,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 92
      });
    });

    test('should parse pipe-delimited format', () => {
      const payload = 'TC-001|2025-09-09T12:06:00Z|LOAD:85|SWL:100|LS1:OK|LS2:OK|LS3:FAIL|UT:OK|UTIL:78';
      const result = parseTelemetryPayload(payload);
      
      expect(result).toEqual({
        craneId: 'TC-001',
        ts: '2025-09-09T12:06:00Z',
        load: 85,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'FAIL',
        ut: 'OK',
        util: 78
      });
    });

    test('should parse JSON format', () => {
      const payload = '{"id":"TC-002","ts":"2025-09-09T12:07:00Z","load":45,"swl":80,"ls1":"OK","ls2":"OK","ls3":"OK","ut":"OK","util":56}';
      const result = parseTelemetryPayload(payload);
      
      expect(result).toEqual({
        craneId: 'TC-002',
        ts: '2025-09-09T12:07:00Z',
        load: 45,
        swl: 80,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 56
      });
    });

    test('should handle extra whitespace', () => {
      const payload = '  TS=2025-09-09T12:05:10Z;ID=TC-004;LOAD=120;SWL=100;LS1=OK;LS2=OK;LS3=OK;UT=OK;UTIL=92  ';
      const result = parseTelemetryPayload(payload);
      
      expect(result).toEqual({
        craneId: 'TC-004',
        ts: '2025-09-09T12:05:10Z',
        load: 120,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 92
      });
    });

    test('should handle missing fields gracefully', () => {
      const payload = 'TS=2025-09-09T12:05:10Z;ID=TC-004;LOAD=120';
      const result = parseTelemetryPayload(payload);
      
      expect(result).toEqual({
        craneId: 'TC-004',
        ts: '2025-09-09T12:05:10Z',
        load: 120,
        swl: 0,
        ls1: 'UNKNOWN',
        ls2: 'UNKNOWN',
        ls3: 'UNKNOWN',
        ut: 'UNKNOWN',
        util: 0
      });
    });

    test('should return null for invalid payload', () => {
      const payload = 'invalid payload format';
      const result = parseTelemetryPayload(payload);
      
      expect(result).toBeNull();
    });

    test('should return null for empty payload', () => {
      const payload = '';
      const result = parseTelemetryPayload(payload);
      
      expect(result).toBeNull();
    });

    test('should return null for null payload', () => {
      const payload = null;
      const result = parseTelemetryPayload(payload);
      
      expect(result).toBeNull();
    });
  });

  describe('validateTelemetryData', () => {
    test('should validate correct data', () => {
      const data = {
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z',
        load: 85,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 85
      };
      
      expect(validateTelemetryData(data)).toBe(true);
    });

    test('should reject data with missing craneId', () => {
      const data = {
        ts: '2025-09-09T12:05:10Z',
        load: 85,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 85
      };
      
      expect(validateTelemetryData(data)).toBe(false);
    });

    test('should reject data with invalid timestamp', () => {
      const data = {
        craneId: 'TC-001',
        ts: 'invalid-timestamp',
        load: 85,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 85
      };
      
      expect(validateTelemetryData(data)).toBe(false);
    });

    test('should reject data with negative load', () => {
      const data = {
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z',
        load: -10,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 85
      };
      
      expect(validateTelemetryData(data)).toBe(false);
    });

    test('should reject data with invalid SWL', () => {
      const data = {
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z',
        load: 85,
        swl: 0,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 85
      };
      
      expect(validateTelemetryData(data)).toBe(false);
    });

    test('should reject data with invalid utilization', () => {
      const data = {
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z',
        load: 85,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 150
      };
      
      expect(validateTelemetryData(data)).toBe(false);
    });

    test('should reject data with invalid status values', () => {
      const data = {
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z',
        load: 85,
        swl: 100,
        ls1: 'INVALID',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 85
      };
      
      expect(validateTelemetryData(data)).toBe(false);
    });
  });

  describe('normalizeTelemetryData', () => {
    test('should normalize data correctly', () => {
      const data = {
        craneId: '  tc-001  ',
        ts: '  2025-09-09T12:05:10Z  ',
        load: 85.123456,
        swl: 100.987654,
        ls1: 'ok',
        ls2: 'fail',
        ls3: 'unknown',
        ut: 'OK',
        util: 95.678
      };
      
      const result = normalizeTelemetryData(data);
      
      expect(result).toEqual({
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z',
        load: 85.12,
        swl: 100.99,
        ls1: 'OK',
        ls2: 'FAIL',
        ls3: 'UNKNOWN',
        ut: 'OK',
        util: 95.68
      });
    });

    test('should clamp utilization between 0-100', () => {
      const data = {
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z',
        load: 85,
        swl: 100,
        ls1: 'OK',
        ls2: 'OK',
        ls3: 'OK',
        ut: 'OK',
        util: 150
      };
      
      const result = normalizeTelemetryData(data);
      
      expect(result.util).toBe(100);
    });

    test('should handle missing fields', () => {
      const data = {
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z'
      };
      
      const result = normalizeTelemetryData(data);
      
      expect(result).toEqual({
        craneId: 'TC-001',
        ts: '2025-09-09T12:05:10Z',
        load: 0,
        swl: 0,
        ls1: 'UNKNOWN',
        ls2: 'UNKNOWN',
        ls3: 'UNKNOWN',
        ut: 'UNKNOWN',
        util: 0
      });
    });
  });

  describe('Integration tests with sample payloads', () => {
    const samplePayloads = [
      {
        name: 'Semicolon format - Normal operation',
        payload: 'TS=2025-09-09T12:05:10Z;ID=TC-004;LOAD=120;SWL=100;LS1=OK;LS2=OK;LS3=OK;UT=OK;UTIL=92',
        expected: {
          craneId: 'TC-004',
          ts: '2025-09-09T12:05:10Z',
          load: 120,
          swl: 100,
          ls1: 'OK',
          ls2: 'OK',
          ls3: 'OK',
          ut: 'OK',
          util: 92
        }
      },
      {
        name: 'Pipe format - Limit switch failure',
        payload: 'TC-001|2025-09-09T12:06:00Z|LOAD:85|SWL:100|LS1:OK|LS2:OK|LS3:FAIL|UT:OK|UTIL:78',
        expected: {
          craneId: 'TC-001',
          ts: '2025-09-09T12:06:00Z',
          load: 85,
          swl: 100,
          ls1: 'OK',
          ls2: 'OK',
          ls3: 'FAIL',
          ut: 'OK',
          util: 78
        }
      },
      {
        name: 'JSON format - Normal operation',
        payload: '{"id":"TC-002","ts":"2025-09-09T12:07:00Z","load":45,"swl":80,"ls1":"OK","ls2":"OK","ls3":"OK","ut":"OK","util":56}',
        expected: {
          craneId: 'TC-002',
          ts: '2025-09-09T12:07:00Z',
          load: 45,
          swl: 80,
          ls1: 'OK',
          ls2: 'OK',
          ls3: 'OK',
          ut: 'OK',
          util: 56
        }
      }
    ];

    samplePayloads.forEach(({ name, payload, expected }) => {
      test(`should parse ${name}`, () => {
        const result = parseTelemetryPayload(payload);
        expect(result).toEqual(expected);
        expect(validateTelemetryData(result)).toBe(true);
      });
    });
  });
});
