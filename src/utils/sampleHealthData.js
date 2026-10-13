/**
 * sampleHealthData.js
 *
 * DEVELOPMENT/DEMO-ONLY dataset for Phase 4 health trend graphs.
 * This is SYNTHETIC data used solely to demonstrate chart features.
 * Do not permanently insert into DB or use as real clinical data.
 */

const demoDate = (monthsAgo) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(15);
  return d.toISOString();
};

export const SAMPLE_OBSERVATIONS = [
  // ─── VITALS (Increasing trend) ───
  { testName: 'Systolic BP', value: 120, unit: 'mmHg', referenceRange: '90-120', status: 'normal', date: demoDate(4) },
  { testName: 'Systolic BP', value: 125, unit: 'mmHg', referenceRange: '90-120', status: 'borderline', date: demoDate(3) },
  { testName: 'Systolic BP', value: 135, unit: 'mmHg', referenceRange: '90-120', status: 'alert', date: demoDate(2) },
  { testName: 'Systolic BP', value: 142, unit: 'mmHg', referenceRange: '90-120', status: 'alert', date: demoDate(1) },

  { testName: 'Diastolic BP', value: 80, unit: 'mmHg', referenceRange: '60-80', status: 'normal', date: demoDate(4) },
  { testName: 'Diastolic BP', value: 82, unit: 'mmHg', referenceRange: '60-80', status: 'borderline', date: demoDate(3) },
  { testName: 'Diastolic BP', value: 88, unit: 'mmHg', referenceRange: '60-80', status: 'alert', date: demoDate(2) },
  { testName: 'Diastolic BP', value: 95, unit: 'mmHg', referenceRange: '60-80', status: 'alert', date: demoDate(1) },

  // ─── HEMATOLOGY (Decreasing trend) ───
  { testName: 'Hemoglobin', value: 14.5, unit: 'g/dL', referenceRange: '13.5-17.5', status: 'normal', date: demoDate(4) },
  { testName: 'Hemoglobin', value: 13.8, unit: 'g/dL', referenceRange: '13.5-17.5', status: 'normal', date: demoDate(3) },
  { testName: 'Hemoglobin', value: 13.1, unit: 'g/dL', referenceRange: '13.5-17.5', status: 'borderline', date: demoDate(2) },
  { testName: 'Hemoglobin', value: 12.2, unit: 'g/dL', referenceRange: '13.5-17.5', status: 'alert', date: demoDate(1) },

  { testName: 'Platelets', value: 250, unit: '10^3/uL', referenceRange: '150-450', status: 'normal', date: demoDate(4) },
  { testName: 'Platelets', value: 245, unit: '10^3/uL', referenceRange: '150-450', status: 'normal', date: demoDate(3) },
  { testName: 'Platelets', value: 240, unit: '10^3/uL', referenceRange: '150-450', status: 'normal', date: demoDate(2) },
  { testName: 'Platelets', value: 238, unit: '10^3/uL', referenceRange: '150-450', status: 'normal', date: demoDate(1) },

  // ─── METABOLIC (Stable trend) ───
  { testName: 'HbA1c', value: 5.4, unit: '%', referenceRange: '4.0-5.6', status: 'normal', date: demoDate(4) },
  { testName: 'HbA1c', value: 5.5, unit: '%', referenceRange: '4.0-5.6', status: 'normal', date: demoDate(3) },
  { testName: 'HbA1c', value: 5.4, unit: '%', referenceRange: '4.0-5.6', status: 'normal', date: demoDate(2) },
  { testName: 'HbA1c', value: 5.5, unit: '%', referenceRange: '4.0-5.6', status: 'normal', date: demoDate(1) },
  
  // ─── KIDNEY (Recovery trend - decreasing towards normal) ───
  { testName: 'Creatinine', value: 1.8, unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'alert', date: demoDate(4) },
  { testName: 'Creatinine', value: 1.5, unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'borderline', date: demoDate(3) },
  { testName: 'Creatinine', value: 1.2, unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'normal', date: demoDate(2) },
  { testName: 'Creatinine', value: 1.1, unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'normal', date: demoDate(1) },

  // ─── LIVER (Only 1 observation - requires more data) ───
  { testName: 'ALT', value: 45, unit: 'U/L', referenceRange: '7-55', status: 'normal', date: demoDate(1) },
];

export const getSamplePatientOverview = () => {
  const labResultsByTest = {};
  SAMPLE_OBSERVATIONS.forEach(obs => {
    if (!labResultsByTest[obs.testName]) labResultsByTest[obs.testName] = [];
    labResultsByTest[obs.testName].push(obs);
  });

  const recentChanges = [];
  Object.keys(labResultsByTest).forEach(testName => {
    const arr = labResultsByTest[testName];
    if (arr.length >= 2) {
      const prev = arr[arr.length - 2];
      const latest = arr[arr.length - 1];
      const prevVal = Number(prev.value);
      const curVal = Number(latest.value);
      if (!isNaN(prevVal) && !isNaN(curVal)) {
        const diff = (curVal - prevVal).toFixed(1);
        let direction = 'Stable';
        if (curVal > prevVal) direction = 'Increasing';
        if (curVal < prevVal) direction = 'Decreasing';
        recentChanges.push({
          testName,
          unit: latest.unit,
          previousValue: prevVal,
          latestValue: curVal,
          difference: diff,
          direction
        });
      }
    }
  });

  return {
    success: true,
    overview: {
      totalConsultations: 45,
      latestConsultation: demoDate(0),
      totalRecords: 28,
      latestRecord: demoDate(0),
      recentRecords: [
        { id: 'demo1', title: 'Routine Checkup', date: demoDate(1), type: 'consultation-note', notes: 'Patient feeling well. Advised routine labs.' },
        { id: 'demo2', title: 'Blood Work Results', date: demoDate(2), type: 'test-result', notes: 'Creatinine improving.' }
      ],
      recentChanges,
      labResultsByTest,
      vitals: [],
    }
  };
};

export const getSampleDoctorSnapshot = () => {
  // Build what the doctor snapshot modal expects
  const recentLabResults = [];
  const changes = [];
  
  const testGroups = {};
  SAMPLE_OBSERVATIONS.forEach(obs => {
    if (!testGroups[obs.testName]) testGroups[obs.testName] = [];
    testGroups[obs.testName].push(obs);
  });

  Object.values(testGroups).forEach(arr => {
    // latest for recent labs
    recentLabResults.push(arr[arr.length - 1]);
    
    // changes
    if (arr.length >= 2) {
      const prev = arr[arr.length - 2];
      const latest = arr[arr.length - 1];
      changes.push({
        testName: latest.testName,
        previousValue: prev.value,
        latestValue: latest.value,
        unit: latest.unit
      });
    }
  });

  return {
    success: true,
    snapshot: {
      patientDetails: {
        completedConsultationsCount: 45,
        lastConsultation: { date: demoDate(0) },
        previousDoctors: ['Dr. Priya Sen', 'Dr. Alok Verma']
      },
      recentClinicalHistory: [
        { date: demoDate(1), title: 'Routine Checkup', details: 'Patient doing well.' }
      ],
      previousPrescriptions: [
        { date: demoDate(2), doctor: 'Dr. Sen', title: 'Metformin', details: 'Continue current dose' }
      ],
      recentLabResults,
      labChanges: changes
    }
  };
};
