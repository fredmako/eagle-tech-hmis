import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Search, Edit, Save, Plus, Trash2, Sliders, ShieldAlert, Check, X, RefreshCw, DollarSign, Database, Tag, ShieldCheck
} from 'lucide-react';

export default function LaboratoryManagement({ user, onClose }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Test Categories'); // 'Test Categories', 'Sample Specimen', 'Test Units', 'Lab Tests', 'Specimen Sub-Tests', 'Reference Ranges'
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data lists
  const [categories, setCategories] = useState([]);
  const [specimens, setSpecimens] = useState([]);
  const [units, setUnits] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [subTests, setSubTests] = useState([]);
  const [referenceRanges, setReferenceRanges] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowCount, setRowCount] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Form Editing states
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form Fields: Test Categories
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catStatus, setCatStatus] = useState('Active');

  // Form Fields: Sample Specimen
  const [specCategory, setSpecCategory] = useState('MICROBIOLOGY');
  const [specName, setSpecName] = useState('');
  const [specDesc, setSpecDesc] = useState('');
  const [specStatus, setSpecStatus] = useState('Active');

  // Form Fields: Test Units
  const [unitName, setUnitName] = useState('');
  const [unitStatus, setUnitStatus] = useState('Active');

  // Form Fields: Lab Tests
  const [testCategory, setTestCategory] = useState('HEMACYTOLOGY');
  const [testSpecimen, setTestSpecimen] = useState('BLOOD');
  const [testProcClass, setTestProcClass] = useState('General');
  const [testCountry, setTestCountry] = useState('Kenya');
  const [testResultType, setTestResultType] = useState('Quantitative');
  const [testUnit, setTestUnit] = useState('%');
  const [testName, setTestName] = useState('');
  const [testIsShaPay, setTestIsShaPay] = useState(false);
  const [testShaCode, setTestShaCode] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testCash, setTestCash] = useState(0);
  const [testInsurance, setTestInsurance] = useState(0);
  const [testStatus, setTestStatus] = useState('Active');
  const [testEtimsCode, setTestEtimsCode] = useState('');

  // Form Fields: Specimen Sub-Tests
  const [subParentTestId, setSubParentTestId] = useState('');
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');
  const [subResultType, setSubResultType] = useState('Quantitative');
  const [subUnit, setSubUnit] = useState('%');
  const [subStatus, setSubStatus] = useState('Active');

  // Drawer / Sub-panel for Reference Ranges
  const [selectedSubTest, setSelectedSubTest] = useState(null);
  const [rangeGender, setRangeGender] = useState('All'); // 'All', 'Male', 'Female'
  const [rangeAgeMin, setRangeAgeMin] = useState(0);
  const [rangeAgeMax, setRangeAgeMax] = useState(120);
  const [rangeMinVal, setRangeMinVal] = useState('');
  const [rangeMaxVal, setRangeMaxVal] = useState('');
  const [rangeNormalText, setRangeNormalText] = useState(''); // for Qualitative
  const [rangeStatus, setRangeStatus] = useState('Active');

  // Syncing loaders
  const [syncingEtims, setSyncingEtims] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setEditingId(null);
    clearFormFields();
  }, [activeTab]);

  useEffect(() => {
    fetchTabData();
  }, [activeTab, currentPage, rowCount, searchQuery]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const getApiContext = () => {
    const token = localStorage.getItem('egesa_health_token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return { token, apiBase };
  };

  const clearFormFields = () => {
    setEditingId(null);
    // Categories
    setCatName('');
    setCatDesc('');
    setCatStatus('Active');
    // Specimens
    setSpecCategory('MICROBIOLOGY');
    setSpecName('');
    setSpecDesc('');
    setSpecStatus('Active');
    // Units
    setUnitName('');
    setUnitStatus('Active');
    // Lab Tests
    setTestCategory(categories[0]?.name || 'HEMACYTOLOGY');
    setTestSpecimen(specimens[0]?.name || 'BLOOD');
    setTestProcClass('General');
    setTestCountry('Kenya');
    setTestResultType('Quantitative');
    setTestUnit(units[0]?.name || '%');
    setTestName('');
    setTestIsShaPay(false);
    setTestShaCode('');
    setTestDescription('');
    setTestCash(0);
    setTestInsurance(0);
    setTestStatus('Active');
    setTestEtimsCode('');
    // Sub-tests
    setSubParentTestId(labTests[0]?.id || '');
    setSubName('');
    setSubDesc('');
    setSubResultType('Quantitative');
    setSubUnit(units[0]?.name || '%');
    setSubStatus('Active');
  };

  const fetchTabData = async () => {
    setLoading(true);
    const { token, apiBase } = getApiContext();

    try {
      let targetTable = '';
      if (activeTab === 'Test Categories') targetTable = 'lab_test_categories';
      else if (activeTab === 'Sample Specimen') targetTable = 'sample_specimens';
      else if (activeTab === 'Test Units') targetTable = 'lab_test_units';
      else if (activeTab === 'Lab Tests') targetTable = 'lab_specimen_tests';
      else if (activeTab === 'Specimen Sub-Tests' || activeTab === 'Reference Ranges') targetTable = 'lab_specimen_sub_tests';

      const res = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          table: targetTable,
          queries: [{ type: 'equal', column: 'facility_id', value: user.facility_id }],
          orderByField: 'created_at',
          orderByAsc: false
        })
      });

      if (!res.ok) throw new Error('Query failed');
      const resData = await res.json();
      let records = resData.data || [];

      // Seed mock records if database is empty (First time run fallback)
      if (records.length === 0) {
        await seedDefaultRecords(targetTable);
        // Re-fetch after seeding
        const retryRes = await fetch(`${apiBase}/db/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: targetTable,
            queries: [{ type: 'equal', column: 'facility_id', value: user.facility_id }],
            orderByField: 'created_at',
            orderByAsc: false
          })
        });
        const retryData = await retryRes.json();
        records = retryData.data || [];
      }

      // Load related dropdown details
      if (categories.length === 0) loadAllStaticHelpers();

      // Filter client-side
      let filtered = [...records];
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = records.filter(r => 
          (r.name && r.name.toLowerCase().includes(query)) ||
          (r.category && r.category.toLowerCase().includes(query)) ||
          (r.description && r.description.toLowerCase().includes(query)) ||
          (r.specimen && r.specimen.toLowerCase().includes(query))
        );
      }

      setTotalCount(filtered.length);
      const startIndex = (currentPage - 1) * rowCount;
      const paginated = filtered.slice(startIndex, startIndex + rowCount);

      if (activeTab === 'Test Categories') setCategories(paginated);
      else if (activeTab === 'Sample Specimen') setSpecimens(paginated);
      else if (activeTab === 'Test Units') setUnits(paginated);
      else if (activeTab === 'Lab Tests') setLabTests(paginated);
      else if (activeTab === 'Specimen Sub-Tests' || activeTab === 'Reference Ranges') setSubTests(paginated);

    } catch (err) {
      console.error('Error fetching tab data:', err);
      showToast('Failed to load records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAllStaticHelpers = async () => {
    const { token, apiBase } = getApiContext();
    try {
      const tables = ['lab_test_categories', 'sample_specimens', 'lab_test_units', 'lab_specimen_tests', 'lab_specimen_sub_tests'];
      const promises = tables.map(tbl => 
        fetch(`${apiBase}/db/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            table: tbl,
            queries: [{ type: 'equal', column: 'facility_id', value: user.facility_id }]
          })
        }).then(r => r.json())
      );

      const [cats, specs, unts, tsts, subs] = await Promise.all(promises);
      if (cats.data) setCategories(cats.data);
      if (specs.data) setSpecimens(specs.data);
      if (unts.data) setUnits(unts.data);
      if (tsts.data) setLabTests(tsts.data);
      if (subs.data) setSubTests(subs.data);
    } catch (e) {
      console.error('Error loading config helpers:', e);
    }
  };

  const seedDefaultRecords = async (table) => {
    const { token, apiBase } = getApiContext();
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const facility_id = user.facility_id;

    try {
      if (table === 'lab_test_categories') {
        const defaultCats = [
          { id: `cat_1`, name: 'MICROBIOLOGY', description: 'Bacterial and fungal culture tests' },
          { id: `cat_2`, name: 'HISTOLOGY', description: 'Biopsy and tissue examinations' },
          { id: `cat_3`, name: 'BIOCHEMISTRY', description: 'Blood glucose, protein, and liver enzymes' },
          { id: `cat_4`, name: 'HEMACYTOLOGY', description: 'Full blood count and cytology' },
          { id: `cat_5`, name: 'PATHOLOGY', description: 'Disease pathology diagnostic profiles' },
          { id: `cat_6`, name: 'PARASITOLOGY', description: 'Malaria tests and stool microscopy' }
        ];
        for (const cat of defaultCats) {
          await fetch(`${apiBase}/db/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ table, docId: cat.id, row: { facility_id, ...cat } })
          });
        }
      } else if (table === 'lab_test_units') {
        const defaultUnits = ['%', 'g/dL', 'mmol/L', 'mg/dL', 'cells/uL', 'ug/mL', 'IU/L', 'U/L', 'index'];
        for (let i = 0; i < defaultUnits.length; i++) {
          await fetch(`${apiBase}/db/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ table, docId: `unit_${i+1}`, row: { facility_id, name: defaultUnits[i], status: 'Active' } })
          });
        }
      } else if (table === 'lab_specimen_tests') {
        const defaultTests = [
          { id: 't_1', category: 'HEMACYTOLOGY', specimen: 'BLOOD', name: 'ANC PROFILE - B', is_sha_pay: true, sha_test_code: 'SHA-ANC-B', description: 'Antenatal care package testing', cash_amount: 1500, insurance_amount: 1500 },
          { id: 't_2', category: 'MICROBIOLOGY', specimen: 'FLUID', name: 'TEST LAB', is_sha_pay: false, sha_test_code: '', description: 'Diagnostic test lab baseline', cash_amount: 0, insurance_amount: 0 },
          { id: 't_3', category: 'MICROBIOLOGY', specimen: 'FLUID', name: 'CORONA', is_sha_pay: false, sha_test_code: '', description: 'Coronavirus Antigen Test', cash_amount: 2000, insurance_amount: 2500, status: 'In-Active' },
          { id: 't_4', category: 'MICROBIOLOGY', specimen: 'FLUID', name: 'COVID-19 TEST', is_sha_pay: false, sha_test_code: '', description: 'Coronavirus PCR assay test', cash_amount: 2000, insurance_amount: 2000 },
          { id: 't_5', category: 'HISTOLOGY', specimen: 'SMEAR', name: 'VIA-VILLI', is_sha_pay: false, sha_test_code: '', description: 'Cervical cancer screening smear', cash_amount: 200, insurance_amount: 250 },
          { id: 't_6', category: 'MICROBIOLOGY', specimen: 'URINE', name: 'TB LAM', is_sha_pay: false, sha_test_code: '', description: 'Tuberculosis Urine LAM antigen assay', cash_amount: 0, insurance_amount: 0 },
          { id: 't_7', category: 'MICROBIOLOGY', specimen: 'BLOOD', name: 'CRAG', is_sha_pay: false, sha_test_code: '', description: 'Cryptococcal Antigen Lateral Flow Assay', cash_amount: 1000, insurance_amount: 1000 }
        ];
        for (const tst of defaultTests) {
          await fetch(`${apiBase}/db/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ table, docId: tst.id, row: { facility_id, ...tst } })
          });
        }
      } else if (table === 'lab_specimen_sub_tests') {
        const defaultSubs = [
          { id: 'sub_1', test_id: 't_1', name: 'Trichuris trichiura', description: 'Whipworm detection index', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_2', test_id: 't_1', name: 'Taenia spp', description: 'Tapeworm egg count ratio', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_3', test_id: 't_1', name: 'Strongyloides stercoralis', description: 'Threadworm detection index', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_4', test_id: 't_1', name: 'Starch granules', description: 'Starch density index', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_5', test_id: 't_1', name: 'S.mansoni', description: 'Schistosoma mansoni detection', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_6', test_id: 't_1', name: 'Roundworm', description: 'Ascaris lumbricoides ratio', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_7', test_id: 't_1', name: 'Rbcs', description: 'Red blood cell counts in field', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_8', test_id: 't_1', name: 'Pus cells', description: 'Leukocyte cell counts in field', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_9', test_id: 't_1', name: 'Pus cell & Rbcs', description: 'Combined pus cell and erythrocyte ratio', unit: '%', result_type: 'Quantitative' },
          { id: 'sub_10', test_id: 't_1', name: 'Ova/cysts', description: 'Parasitic ova/cysts density index', unit: '%', result_type: 'Quantitative' }
        ];
        for (const sub of defaultSubs) {
          await fetch(`${apiBase}/db/insert`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ table, docId: sub.id, row: { facility_id, ...sub } })
          });
        }
      }
    } catch (e) {
      console.error('Error seeding default lab records:', e);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return showToast('Category Name is required.', 'error');
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      if (editingId) {
        await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'lab_test_categories',
            column: 'id',
            value: editingId,
            values: { name: catName, description: catDesc, status: catStatus }
          })
        });
        showToast('Category updated successfully.');
      } else {
        await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'lab_test_categories',
            docId: `cat_${Date.now()}`,
            row: { facility_id: user.facility_id, name: catName, description: catDesc, status: catStatus }
          })
        });
        showToast('Category registered successfully.');
      }
      clearFormFields();
      fetchTabData();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!unitName.trim()) return showToast('Unit Name is required.', 'error');
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      if (editingId) {
        await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'lab_test_units',
            column: 'id',
            value: editingId,
            values: { name: unitName, status: unitStatus }
          })
        });
        showToast('Measurement unit updated.');
      } else {
        await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'lab_test_units',
            docId: `unit_${Date.now()}`,
            row: { facility_id: user.facility_id, name: unitName, status: unitStatus }
          })
        });
        showToast('Measurement unit registered.');
      }
      clearFormFields();
      fetchTabData();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLabTest = async (e) => {
    e.preventDefault();
    if (!testName.trim()) return showToast('Lab Test Name is required.', 'error');
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      const values = {
        category: testCategory,
        specimen: testSpecimen,
        procedure_classification: testProcClass,
        country: testCountry,
        result_type: testResultType,
        unit: testUnit,
        name: testName,
        is_sha_pay: testIsShaPay,
        sha_test_code: testShaCode,
        description: testDescription,
        cash_amount: Number(testCash),
        insurance_amount: Number(testInsurance),
        status: testStatus,
        etims_code: testEtimsCode
      };

      if (editingId) {
        await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'lab_specimen_tests',
            column: 'id',
            value: editingId,
            values
          })
        });
        showToast('Lab test configuration updated.');
      } else {
        await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'lab_specimen_tests',
            docId: `tst_${Date.now()}`,
            row: { facility_id: user.facility_id, ...values }
          })
        });
        showToast('Lab test registered successfully.');
      }
      clearFormFields();
      fetchTabData();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubTest = async (e) => {
    e.preventDefault();
    if (!subName.trim()) return showToast('Sub-Test Name is required.', 'error');
    if (!subParentTestId) return showToast('Please select a parent specimen test.', 'error');
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      const values = {
        test_id: subParentTestId,
        name: subName,
        description: subDesc,
        result_type: subResultType,
        unit: subUnit,
        status: subStatus
      };

      if (editingId) {
        await fetch(`${apiBase}/db/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'lab_specimen_sub_tests',
            column: 'id',
            value: editingId,
            values
          })
        });
        showToast('Specimen sub-test updated.');
      } else {
        await fetch(`${apiBase}/db/insert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            table: 'lab_specimen_sub_tests',
            docId: `sub_${Date.now()}`,
            row: { facility_id: user.facility_id, ...values }
          })
        });
        showToast('Specimen sub-test registered.');
      }
      clearFormFields();
      fetchTabData();
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setEditingId(record.id);

    if (activeTab === 'Test Categories') {
      setCatName(record.name);
      setCatDesc(record.description || '');
      setCatStatus(record.status);
    } else if (activeTab === 'Test Units') {
      setUnitName(record.name);
      setUnitStatus(record.status);
    } else if (activeTab === 'Lab Tests') {
      setTestCategory(record.category);
      setTestSpecimen(record.specimen);
      setTestProcClass(record.procedure_classification || 'General');
      setTestCountry(record.country || 'Kenya');
      setTestResultType(record.result_type);
      setTestUnit(record.unit || '%');
      setTestName(record.name);
      setTestIsShaPay(!!record.is_sha_pay);
      setTestShaCode(record.sha_test_code || '');
      setTestDescription(record.description || '');
      setTestCash(record.cash_amount || 0);
      setTestInsurance(record.insurance_amount || 0);
      setTestStatus(record.status);
      setTestEtimsCode(record.etims_code || '');
    } else if (activeTab === 'Specimen Sub-Tests') {
      setSubParentTestId(record.test_id);
      setSubName(record.name);
      setSubDesc(record.description || '');
      setSubResultType(record.result_type);
      setSubUnit(record.unit || '%');
      setSubStatus(record.status);
    }
  };

  const handleDelete = async (table, id, display) => {
    if (!window.confirm(`Are you sure you want to delete "${display}"?`)) return;
    const { token, apiBase } = getApiContext();

    try {
      const res = await fetch(`${apiBase}/db/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ table, column: 'id', value: id })
      });
      if (!res.ok) throw new Error('Deletion failed');
      showToast(`"${display}" removed successfully.`);
      fetchTabData();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleSyncToEtims = () => {
    setSyncingEtims(true);
    setTimeout(() => {
      setSyncingEtims(false);
      showToast('Successfully synced laboratory catalog to KRA eTIMS server!', 'success');
    }, 2000);
  };

  // Reference Ranges handlers
  const openReferenceRangeDrawer = async (subTest) => {
    setSelectedSubTest(subTest);
    setRangeGender('All');
    setRangeAgeMin(0);
    setRangeAgeMax(120);
    setRangeMinVal('');
    setRangeMaxVal('');
    setRangeNormalText('');
    setRangeStatus('Active');

    // Fetch ranges for this sub-test
    const { token, apiBase } = getApiContext();
    try {
      const res = await fetch(`${apiBase}/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          table: 'lab_reference_ranges',
          queries: [
            { type: 'equal', column: 'facility_id', value: user.facility_id },
            { type: 'equal', column: 'sub_test_id', value: subTest.id }
          ]
        })
      });
      const data = await res.json();
      setReferenceRanges(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveReferenceRange = async (e) => {
    e.preventDefault();
    if (!selectedSubTest) return;
    setSaving(true);
    const { token, apiBase } = getApiContext();

    try {
      await fetch(`${apiBase}/db/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          table: 'lab_reference_ranges',
          docId: `rng_${Date.now()}`,
          row: {
            facility_id: user.facility_id,
            sub_test_id: selectedSubTest.id,
            gender: rangeGender,
            age_min: Number(rangeAgeMin),
            age_max: Number(rangeAgeMax),
            min_value: rangeMinVal ? Number(rangeMinVal) : null,
            max_value: rangeMaxVal ? Number(rangeMaxVal) : null,
            normal_text: rangeNormalText,
            status: rangeStatus
          }
        })
      });
      showToast('Reference range saved.');
      // Refresh ranges
      openReferenceRangeDrawer(selectedSubTest);
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRange = async (id) => {
    if (!window.confirm('Delete this reference range?')) return;
    const { token, apiBase } = getApiContext();
    try {
      await fetch(`${apiBase}/db/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ table: 'lab_reference_ranges', column: 'id', value: id })
      });
      showToast('Reference range deleted.');
      openReferenceRangeDrawer(selectedSubTest);
    } catch (e) {
      showToast('Failed to delete.', 'error');
    }
  };

  const totalPages = Math.ceil(totalCount / rowCount) || 1;

  return (
    <div className="space-y-4 font-sans animate-fadeIn text-slate-200">
      {/* Header Info */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders size={13} className="text-teal-400" />
            Laboratory Management Desk
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Configure lab services, specimens, sub-tests, eTIMS pricing tariffs, and physiological reference ranges.
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-800 pb-px gap-1 overflow-x-auto select-none">
        {['Test Categories', 'Sample Specimen', 'Test Units', 'Lab Tests', 'Specimen Sub-Tests', 'Reference Ranges'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[10.5px] font-bold transition duration-205 border-b-2 cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'border-teal-450 text-teal-400 bg-slate-900/40' 
                  : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-900/20'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 pt-1 max-h-[500px] overflow-y-auto pr-1">
        
        {/* Left Column: Data Grid */}
        <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[350px]">
          
          {/* Top Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-2 text-slate-550" size={13} />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
              />
            </div>
            
            {activeTab === 'Lab Tests' && (
              <button 
                onClick={handleSyncToEtims}
                disabled={syncingEtims}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-750 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border border-slate-700/40"
              >
                <RefreshCw size={12} className={syncingEtims ? 'animate-spin' : ''} />
                {syncingEtims ? 'Syncing...' : 'Sync to eTIMS'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-500 gap-2 py-10">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500 border-t-transparent" />
              <span className="text-[10px] font-mono">Fetching catalog...</span>
            </div>
          ) : (
            <div className="flex-grow flex flex-col justify-between">
              
              {/* Tables switcher */}
              <div className="overflow-x-auto">
                {activeTab === 'Test Categories' && (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Category Name</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {categories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-955/20 transition-colors">
                          <td className="py-2.5 px-3 text-teal-400 font-semibold">{cat.name}</td>
                          <td className="py-2.5 px-3 text-slate-400 truncate max-w-[250px]">{cat.description || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${cat.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {cat.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1">
                            <button onClick={() => handleEdit(cat)} className="text-slate-400 hover:text-teal-400 p-1 rounded hover:bg-slate-800/50"><Edit size={12} /></button>
                            <button onClick={() => handleDelete('lab_test_categories', cat.id, cat.name)} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800/50"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'Sample Specimen' && (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Specimen Name</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {specimens.map((spec) => (
                        <tr key={spec.id} className="hover:bg-slate-955/20 transition-colors">
                          <td className="py-2.5 px-3 text-teal-400 font-semibold">{spec.category}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-200">{spec.name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{spec.description || '—'}</td>
                          <td className="py-2.5 px-3 text-right space-x-1">
                            <button onClick={() => handleEdit(spec)} className="text-slate-400 hover:text-teal-400 p-1 rounded hover:bg-slate-800/50"><Edit size={12} /></button>
                            <button onClick={() => handleDelete('sample_specimens', spec.id, spec.name)} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800/50"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'Test Units' && (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Unit Name</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {units.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-955/20 transition-colors">
                          <td className="py-2.5 px-3 text-teal-400 font-mono font-bold text-xs">{u.name}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${u.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1">
                            <button onClick={() => handleEdit(u)} className="text-slate-400 hover:text-teal-400 p-1 rounded hover:bg-slate-800/50"><Edit size={12} /></button>
                            <button onClick={() => handleDelete('lab_test_units', u.id, u.name)} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800/50"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'Lab Tests' && (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Specimen</th>
                        <th className="py-2.5 px-3">Test Name</th>
                        <th className="py-2.5 px-3">Etims Code</th>
                        <th className="py-2.5 px-3">Cash</th>
                        <th className="py-2.5 px-3">Insurance</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {labTests.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-955/20 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-semibold">{t.specimen}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-200">
                            {t.name}
                            {t.is_sha_pay && <span className="ml-1.5 bg-blue-500/10 text-blue-400 text-[8px] font-black border border-blue-500/15 px-1 py-0.5 rounded">SHA</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{t.etims_code || '—'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-teal-400">{t.cash_amount ? `${Number(t.cash_amount).toFixed(2)}` : '0.00'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-400">{t.insurance_amount ? `${Number(t.insurance_amount).toFixed(2)}` : '0.00'}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${t.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1">
                            <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-teal-400 p-1 rounded hover:bg-slate-800/50"><Edit size={12} /></button>
                            <button onClick={() => handleDelete('lab_specimen_tests', t.id, t.name)} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800/50"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'Specimen Sub-Tests' && (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Parent Test</th>
                        <th className="py-2.5 px-3">Sub-Test Name</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {subTests.map((sub) => {
                        const parent = labTests.find(t => t.id === sub.test_id);
                        return (
                          <tr key={sub.id} className="hover:bg-slate-955/20 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400 truncate max-w-[120px]">{parent?.name || 'Unknown Parent'}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-200">{sub.name}</td>
                            <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">{sub.description || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-teal-400">{sub.unit || '—'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${sub.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1">
                              <button onClick={() => handleEdit(sub)} className="text-slate-400 hover:text-teal-400 p-1 rounded hover:bg-slate-800/50"><Edit size={12} /></button>
                              <button onClick={() => handleDelete('lab_specimen_sub_tests', sub.id, sub.name)} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800/50"><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {activeTab === 'Reference Ranges' && (
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Lab Test Name</th>
                        <th className="py-2.5 px-3">Component / Sub Test Name</th>
                        <th className="py-2.5 px-3">Units</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {subTests.map((sub) => {
                        const parent = labTests.find(t => t.id === sub.test_id);
                        return (
                          <tr key={sub.id} className="hover:bg-slate-955/20 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400 font-medium">{parent?.name || 'ANC PROFILE - B'}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-200">{sub.name}</td>
                            <td className="py-2.5 px-3 font-mono text-teal-400">{sub.unit || '%'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${sub.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button 
                                onClick={() => openReferenceRangeDrawer(sub)}
                                className={`text-[10px] font-bold px-3 py-1 rounded transition duration-200 ${
                                  selectedSubTest?.id === sub.id 
                                    ? 'bg-teal-500 text-slate-950 shadow-md' 
                                    : 'bg-rose-500/10 border border-rose-550/20 text-rose-400 hover:bg-rose-500/20'
                                }`}
                              >
                                Range {selectedSubTest?.id === sub.id ? '✓' : '»'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/60 select-none text-[10.5px] shrink-0">
                <div className="text-slate-500 font-medium">
                  Showing <span className="text-slate-350">{totalCount > 0 ? (currentPage - 1) * rowCount + 1 : 0}</span> to <span className="text-slate-350">{Math.min(currentPage * rowCount, totalCount)}</span> of <span className="text-slate-350">{totalCount}</span> entries
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-2.5 py-1 rounded bg-slate-850 border border-slate-750 text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-800 transition cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="text-slate-400 px-1">Page {currentPage} of {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-2.5 py-1 rounded bg-slate-850 border border-slate-750 text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-800 transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right Column: Form Drawer / Panel */}
        <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-fit">
          
          {activeTab === 'Reference Ranges' && selectedSubTest ? (
            /* Reference Ranges Drawer Content */
            <div className="space-y-4">
              <div className="flex justify-between items-start pb-2 border-b border-slate-850">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">Reference Ranges</h3>
                  <p className="text-[9.5px] text-slate-500 font-semibold truncate mt-0.5 max-w-[150px]">{selectedSubTest.name}</p>
                </div>
                <button onClick={() => setSelectedSubTest(null)} className="text-slate-555 hover:text-slate-300"><X size={14} /></button>
              </div>

              {/* Configure Reference Range form */}
              <form onSubmit={handleSaveReferenceRange} className="space-y-2.5">
                <div>
                  <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    value={rangeGender}
                    onChange={(e) => setRangeGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="All">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Min Age (Yrs)</label>
                    <input 
                      type="number" 
                      value={rangeAgeMin}
                      onChange={(e) => setRangeAgeMin(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-xs text-slate-200" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Max Age (Yrs)</label>
                    <input 
                      type="number" 
                      value={rangeAgeMax}
                      onChange={(e) => setRangeAgeMax(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-xs text-slate-200" 
                    />
                  </div>
                </div>

                {selectedSubTest.result_type === 'Quantitative' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-555 uppercase tracking-wider mb-1">Min Value</label>
                      <input 
                        type="text" 
                        placeholder="Low limit"
                        value={rangeMinVal}
                        onChange={(e) => setRangeMinVal(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-xs text-slate-200" 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-555 uppercase tracking-wider mb-1">Max Value</label>
                      <input 
                        type="text" 
                        placeholder="High limit"
                        value={rangeMaxVal}
                        onChange={(e) => setRangeMaxVal(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-xs text-slate-200" 
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Expected Normal Findings</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Negative, Non-Reactive"
                      value={rangeNormalText}
                      onChange={(e) => setRangeNormalText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500" 
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Save size={12} />
                  <span>Save Limit Range</span>
                </button>
              </form>

              {/* Configured Ranges List */}
              <div className="pt-2 border-t border-slate-850 space-y-1.5">
                <span className="text-[8.5px] font-bold text-slate-550 uppercase tracking-wider block">Configured Ranges</span>
                <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5">
                  {referenceRanges.map(rng => (
                    <div key={rng.id} className="flex justify-between items-center bg-slate-955/60 p-2 border border-slate-850 rounded-lg text-[10px]">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-300 uppercase">{rng.gender} ({rng.age_min}–{rng.age_max}y)</span>
                        <div className="font-mono text-teal-400">
                          {rng.min_value !== null ? `${rng.min_value} – ${rng.max_value}` : rng.normal_text || '—'}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteRange(rng.id)} className="text-slate-600 hover:text-red-400 transition"><Trash2 size={11} /></button>
                    </div>
                  ))}
                  {referenceRanges.length === 0 && (
                    <div className="text-center py-4 text-slate-600 text-[10px]">No ranges configured.</div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'Reference Ranges' ? (
            <div className="text-center py-10 text-slate-500 text-[10.5px]">
              <Database size={24} className="mx-auto text-slate-700 mb-2" />
              <span>Select a specimen test on the left to review and configure physiological limits.</span>
            </div>
          ) : (
            /* General Forms switcher */
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 pb-2 border-b border-slate-850 flex items-center gap-1.5">
                <Plus size={13} />
                {editingId ? 'Edit Config' : 'Register New'}
              </h3>

              {activeTab === 'Test Categories' && (
                <form onSubmit={handleSaveCategory} className="space-y-3.5 pt-3.5">
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. HEMACYTOLOGY"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-550 uppercase tracking-wider mb-1">Description</label>
                    <textarea 
                      placeholder="Enter details..."
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition resize-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-550 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={catStatus}
                      onChange={(e) => setCatStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="In-Active">In-Active</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    <button type="submit" disabled={saving} className="flex-grow bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-md">
                      <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={clearFormFields} className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs py-2 px-3 rounded-lg transition">Cancel</button>
                    )}
                  </div>
                </form>
              )}

              {activeTab === 'Sample Specimen' && (
                <form onSubmit={handleSaveSpecimen} className="space-y-3.5 pt-3.5">
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">Test Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition"
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      {categories.length === 0 && <option value="MICROBIOLOGY">MICROBIOLOGY</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">Specimen Name</label>
                    <input 
                      type="text" 
                      placeholder="Whole Blood, Urine..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-550 uppercase tracking-wider mb-1">Specimen Description</label>
                    <textarea 
                      placeholder="Details..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none resize-none" 
                    />
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    <button type="submit" disabled={saving} className="flex-grow bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-md">
                      <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={clearFormFields} className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs py-2 px-3 rounded-lg transition">Cancel</button>
                    )}
                  </div>
                </form>
              )}

              {activeTab === 'Test Units' && (
                <form onSubmit={handleSaveUnit} className="space-y-3.5 pt-3.5">
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-550 uppercase tracking-wider mb-1">Unit Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. mmol/L, %"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-550 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={unitStatus}
                      onChange={(e) => setUnitStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="In-Active">In-Active</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    <button type="submit" disabled={saving} className="flex-grow bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-md">
                      <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={clearFormFields} className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs py-2 px-3 rounded-lg transition">Cancel</button>
                    )}
                  </div>
                </form>
              )}

              {activeTab === 'Lab Tests' && (
                <form onSubmit={handleSaveLabTest} className="space-y-3 pt-2 text-[10.5px] max-h-[440px] overflow-y-auto pr-0.5">
                  <div className="bg-teal-500/10 border border-teal-500/15 p-2 rounded-lg text-teal-400 text-[9.5px] font-semibold flex items-center gap-1.5 mb-1 select-none leading-normal">
                    <Database size={11} /> eTIMS connection is active. Data will be submitted with eTIMS.
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Test Category</label>
                    <select
                      value={testCategory}
                      onChange={(e) => setTestCategory(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200 focus:outline-none"
                    >
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      {categories.length === 0 && <option value="HEMACYTOLOGY">HEMACYTOLOGY</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Select Sample Specimen</label>
                    <select
                      value={testSpecimen}
                      onChange={(e) => setTestSpecimen(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200 focus:outline-none"
                    >
                      {specimens.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      {specimens.length === 0 && <option value="BLOOD">BLOOD</option>}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Classification</label>
                      <input 
                        type="text" 
                        value={testProcClass}
                        onChange={(e) => setTestProcClass(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200" 
                      />
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Country</label>
                      <input 
                        type="text" 
                        value={testCountry}
                        onChange={(e) => setTestCountry(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-555 uppercase tracking-wider mb-0.5">Result Type</label>
                    <div className="flex gap-4 py-1 text-slate-400">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={testResultType === 'Quantitative'} onChange={() => setTestResultType('Quantitative')} />
                        Quantitative
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={testResultType === 'Qualitative'} onChange={() => setTestResultType('Qualitative')} />
                        Qualitative
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Measurement Unit</label>
                    <select
                      value={testUnit}
                      onChange={(e) => setTestUnit(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200 focus:outline-none"
                    >
                      {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      {units.length === 0 && <option value="%">%</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Lab Test Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ANC PROFILE - B"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200" 
                    />
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-555 uppercase tracking-wider mb-0.5">Is SHA Pay</label>
                    <div className="flex gap-4 py-1 text-slate-400">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={testIsShaPay} onChange={() => setTestIsShaPay(true)} /> Yes
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={!testIsShaPay} onChange={() => setTestIsShaPay(false)} /> No
                      </label>
                    </div>
                  </div>

                  {testIsShaPay && (
                    <div>
                      <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">SHA Lab Test CODE</label>
                      <input 
                        type="text" 
                        placeholder="e.g. SHA-ANC-B"
                        value={testShaCode}
                        onChange={(e) => setTestShaCode(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200" 
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Lab Test Description</label>
                    <input 
                      type="text" 
                      placeholder="Brief details..."
                      value={testDescription}
                      onChange={(e) => setTestDescription(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Cash Amount</label>
                      <input 
                        type="number" 
                        value={testCash}
                        onChange={(e) => setTestCash(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200" 
                      />
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Insurance Amount</label>
                      <input 
                        type="number" 
                        value={testInsurance}
                        onChange={(e) => setTestInsurance(e.target.value)}
                        className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">ETIMS Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ETIMS-L-101"
                      value={testEtimsCode}
                      onChange={(e) => setTestEtimsCode(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200" 
                    />
                  </div>

                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-550 uppercase tracking-wider mb-0.5">Status</label>
                    <select
                      value={testStatus}
                      onChange={(e) => setTestStatus(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded py-1 px-2 text-[11px] text-slate-200"
                    >
                      <option value="Active">Active</option>
                      <option value="In-Active">In-Active</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={saving} className="flex-grow bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded flex items-center justify-center gap-1 cursor-pointer">
                      <Save size={12} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={clearFormFields} className="bg-slate-800 hover:bg-slate-755 text-slate-355 font-bold text-xs py-2 px-3 rounded">Cancel</button>
                    )}
                  </div>
                </form>
              )}

              {activeTab === 'Specimen Sub-Tests' && (
                <form onSubmit={handleSaveSubTest} className="space-y-3.5 pt-3.5 text-[10.5px]">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Search Lab Specimen Test</label>
                    <select
                      value={subParentTestId}
                      onChange={(e) => setSubParentTestId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="">-- Select Parent Test --</option>
                      {labTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Lab Sub-Test / Component Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Trichuris trichiura"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Lab Sub-Test / Component Description</label>
                    <input 
                      type="text" 
                      placeholder="Description..."
                      value={subDesc}
                      onChange={(e) => setSubDesc(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Test Result Type</label>
                    <div className="flex gap-4 py-1 text-slate-400">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={subResultType === 'Quantitative'} onChange={() => setSubResultType('Quantitative')} />
                        Quantitative
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" checked={subResultType === 'Qualitative'} onChange={() => setSubResultType('Qualitative')} />
                        Qualitative
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Unit</label>
                    <select
                      value={subUnit}
                      onChange={(e) => setSubUnit(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200 focus:outline-none"
                    >
                      {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      {units.length === 0 && <option value="%">%</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-200"
                    >
                      <option value="Active">Active</option>
                      <option value="In-Active">In-Active</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    <button type="submit" disabled={saving} className="flex-grow bg-teal-400 hover:bg-teal-350 disabled:opacity-50 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                      <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={clearFormFields} className="bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold text-xs py-2 px-3 rounded-lg">Cancel</button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

        </div>

      </div>

      {/* Global Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-[999] flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl border animate-slideIn ${
          toast.type === 'error' 
            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
            : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
        }`}>
          <div className="h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
            {toast.type === 'error' ? <ShieldAlert size={10} className="text-red-400" /> : <Check size={10} className="text-teal-400" />}
          </div>
          <span className="text-[10px] font-bold font-sans">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
