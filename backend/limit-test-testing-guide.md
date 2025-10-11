# 🧪 Limit Test Data Testing Guide

## 📊 **Current Limit Test Data**

### **Database Collection: `limittests`**
- **Total Records**: 8 limit test records
- **TC-101 (TOWER-ALPHA)**: 4 tests
- **TC-901 (TOWER-MEGA)**: 4 tests

### **Test Types Added:**
- ✅ **SCHEDULED** tests (2 per crane)
- ✅ **MANUAL** tests (2 per crane) 
- ✅ **AUTOMATIC** tests (2 per crane)

## 🔍 **How to Test Limit Test Data**

### **1. View All Limit Tests**
```javascript
// Connect to MongoDB and run:
db.limittests.find().sort({testDate: -1}).pretty()
```

### **2. View Tests for Specific Crane**
```javascript
// View TC-101 tests
db.limittests.find({craneId: "TC-101"}).sort({testDate: -1})

// View TC-901 tests  
db.limittests.find({craneId: "TC-901"}).sort({testDate: -1})
```

### **3. View Failed Tests**
```javascript
// Find all failed tests
db.limittests.find({testStatus: "failed"})

// Find tests with critical failures
db.limittests.find({"testResults.overallPassed": false})
```

### **4. View Tests by Type**
```javascript
// Scheduled tests
db.limittests.find({testType: "scheduled"})

// Manual tests
db.limittests.find({testType: "manual"})

// Automatic tests
db.limittests.find({testType: "automatic"})
```

## 🎯 **Test Scenarios You Can Try**

### **Scenario 1: Create a New Failed Test**
```javascript
db.limittests.insertOne({
  craneId: "TC-101",
  testType: "manual",
  testDate: new Date(),
  testStatus: "failed",
  limitSwitches: {
    ls1: { status: "FAIL", responseTime: 100, threshold: 0.95, notes: "Switch stuck" },
    ls2: { status: "OK", responseTime: 45, threshold: 0.95, notes: "Normal" },
    ls3: { status: "OK", responseTime: 50, threshold: 0.95, notes: "Normal" }
  },
  utilityTest: {
    status: "OK",
    responseTime: 120,
    powerLevel: 95,
    notes: "Power stable"
  },
  testResults: {
    overallPassed: false,
    criticalFailures: ["ls1"],
    warnings: ["Switch maintenance required"],
    recommendations: ["Replace ls1 switch immediately"]
  },
  testData: {
    loadAtTest: 5000,
    swlAtTest: 6600,
    utilizationAtTest: 76,
    environmentalConditions: {
      temperature: 30,
      humidity: 70,
      windSpeed: 15
    }
  },
  testDuration: 45,
  nextTestDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  maintenanceRequired: true,
  maintenanceNotes: "Critical: Replace ls1 limit switch"
})
```

### **Scenario 2: Update Existing Test to Failed**
```javascript
// Make the latest TC-101 test fail
db.limittests.updateOne(
  { craneId: "TC-101" },
  { 
    $set: { 
      testStatus: "failed",
      "testResults.overallPassed": false,
      "testResults.criticalFailures": ["ls2"],
      "testResults.warnings": ["Switch malfunction detected"],
      "limitSwitches.ls2.status": "FAIL",
      "limitSwitches.ls2.notes": "Switch not responding",
      maintenanceRequired: true,
      maintenanceNotes: "Urgent: ls2 switch needs replacement"
    }
  }
)
```

### **Scenario 3: Create Overdue Test**
```javascript
// Create a test that's overdue
db.limittests.insertOne({
  craneId: "TC-901",
  testType: "scheduled",
  testDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  testStatus: "passed",
  limitSwitches: {
    ls1: { status: "OK", responseTime: 40, threshold: 0.95 },
    ls2: { status: "OK", responseTime: 42, threshold: 0.95 },
    ls3: { status: "OK", responseTime: 45, threshold: 0.95 }
  },
  utilityTest: {
    status: "OK",
    responseTime: 110,
    powerLevel: 92
  },
  testResults: {
    overallPassed: true,
    criticalFailures: [],
    warnings: [],
    recommendations: []
  },
  testData: {
    loadAtTest: 3000,
    swlAtTest: 5500,
    utilizationAtTest: 55
  },
  testDuration: 30,
  nextTestDue: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (overdue)
  maintenanceRequired: false
})
```

## 📈 **What You'll See in Frontend**

### **Limit Test Data Display:**
- **Test History**: Shows all tests for each crane
- **Test Status**: Passed/Failed indicators
- **Test Types**: Scheduled, Manual, Automatic
- **Response Times**: How quickly switches respond
- **Maintenance Alerts**: When maintenance is required

### **Dashboard Updates:**
- **Test Counts**: Number of tests per crane
- **Failure Rates**: Percentage of failed tests
- **Overdue Tests**: Tests that need attention
- **Maintenance Alerts**: Cranes requiring maintenance

## 🔄 **Auto-Refresh Behavior**

### **When You Add/Update Tests:**
- ✅ **Frontend updates within 10 seconds**
- ✅ **Test counts update automatically**
- ✅ **Status indicators change**
- ✅ **Maintenance alerts appear**

### **Test the Auto-Refresh:**
1. **Add a new test** using the scripts above
2. **Wait 10 seconds**
3. **Check the frontend** - you should see the new test
4. **Update an existing test** to failed status
5. **Wait 10 seconds**
6. **Check the frontend** - you should see the updated status

## 🎯 **Quick Test Commands**

### **View All Tests:**
```javascript
db.limittests.find().sort({testDate: -1}).limit(5)
```

### **Count Tests by Status:**
```javascript
db.limittests.aggregate([
  { $group: { _id: "$testStatus", count: { $sum: 1 } } }
])
```

### **Find Overdue Tests:**
```javascript
db.limittests.find({
  nextTestDue: { $lt: new Date() }
})
```

### **Find Tests Requiring Maintenance:**
```javascript
db.limittests.find({
  maintenanceRequired: true
})
```

## 🚀 **Ready to Test!**

The limit test data is now in your `limittests` collection and will automatically appear in the frontend. You can:

1. **View existing tests** using the MongoDB commands above
2. **Add new tests** using the insert scripts
3. **Update existing tests** to test different scenarios
4. **Watch the frontend** update automatically within 10 seconds

**All changes will be reflected in the frontend automatically!** 🎉
