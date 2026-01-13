/**
 * Smart Field Log Generator - Google Workspace Add-on
 * Create structured, standardized log entries in Google Docs
 */

const UI_LABEL = 'Smart Field Log Generator';

// ========================================
// Add-on Initialization
// ========================================

/**
 * Called when the add-on is installed
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Called when a document is opened
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createMenu('Field Log Generator')
    .addItem('New Log', 'showSidebar')
    .addItem('View Templates', 'showTemplates')
    .addToUi();
}

/**
 * Opens the sidebar
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(UI_LABEL);
  DocumentApp.getUi().showSidebar(html);
}

// ========================================
// API Functions (Called from Sidebar)
// ========================================

/**
 * API: Get available templates
 */
function apiGetTemplates() {
  try {
    return TemplateLibrary.getTemplates();
  } catch (err) {
    console.error('Get templates failed:', err);
    throw new Error('Get templates failed: ' + err.message);
  }
}

/**
 * API: Get template by ID
 */
function apiGetTemplate(templateId) {
  try {
    return TemplateLibrary.getTemplate(templateId);
  } catch (err) {
    console.error('Get template failed:', err);
    throw new Error('Get template failed: ' + err.message);
  }
}

/**
 * API: Generate log from form data
 */
function apiGenerateLog(templateId, formData) {
  try {
    const docUrl = LogGenerator.generateLog(templateId, formData);
    return { success: true, url: docUrl };
  } catch (err) {
    console.error('Generate log failed:', err);
    throw new Error('Generate log failed: ' + err.message);
  }
}

/**
 * API: Save custom template
 */
function apiSaveTemplate(template) {
  try {
    const saved = TemplateLibrary.saveCustomTemplate(template);
    return { success: true, template: saved };
  } catch (err) {
    console.error('Save template failed:', err);
    throw new Error('Save template failed: ' + err.message);
  }
}

// ========================================
// Template Library Module
// ========================================

const TemplateLibrary = (() => {
  const defaultTemplates = [
    {
      id: 'site-visit',
      name: 'Site Visit Log',
      category: 'General',
      fields: [
        { id: 'date', label: 'Date', type: 'date', required: true },
        { id: 'time', label: 'Time', type: 'time', required: true },
        { id: 'location', label: 'Location', type: 'text', required: true },
        { id: 'technician', label: 'Technician', type: 'text', required: true },
        { id: 'purpose', label: 'Purpose', type: 'textarea', required: true },
        { id: 'findings', label: 'Findings', type: 'textarea', required: false },
        { id: 'actions', label: 'Actions Taken', type: 'textarea', required: false },
        { id: 'followUp', label: 'Follow-up Required', type: 'checkbox', required: false }
      ]
    },
    {
      id: 'inspection',
      name: 'Inspection Log',
      category: 'Inspection',
      fields: [
        { id: 'date', label: 'Date', type: 'date', required: true },
        { id: 'time', label: 'Time', type: 'time', required: true },
        { id: 'location', label: 'Location', type: 'text', required: true },
        { id: 'inspector', label: 'Inspector', type: 'text', required: true },
        { id: 'inspectionType', label: 'Inspection Type', type: 'select', options: ['Routine', 'Complaint', 'Follow-up', 'Emergency'], required: true },
        { id: 'conditions', label: 'Conditions Observed', type: 'textarea', required: true },
        { id: 'deficiencies', label: 'Deficiencies Found', type: 'textarea', required: false },
        { id: 'recommendations', label: 'Recommendations', type: 'textarea', required: false },
        { id: 'passed', label: 'Inspection Passed', type: 'checkbox', required: true }
      ]
    },
    {
      id: 'maintenance',
      name: 'Maintenance Log',
      category: 'Maintenance',
      fields: [
        { id: 'date', label: 'Date', type: 'date', required: true },
        { id: 'time', label: 'Time', type: 'time', required: true },
        { id: 'equipment', label: 'Equipment ID', type: 'text', required: true },
        { id: 'technician', label: 'Technician', type: 'text', required: true },
        { id: 'workType', label: 'Work Type', type: 'select', options: ['Preventive', 'Corrective', 'Emergency', 'Upgrade'], required: true },
        { id: 'description', label: 'Work Description', type: 'textarea', required: true },
        { id: 'partsUsed', label: 'Parts Used', type: 'textarea', required: false },
        { id: 'timeSpent', label: 'Time Spent (hours)', type: 'number', required: false },
        { id: 'status', label: 'Status', type: 'select', options: ['Completed', 'In Progress', 'Pending Parts', 'Scheduled'], required: true }
      ]
    }
  ];
  
  function getTemplates() {
    const properties = PropertiesService.getScriptProperties();
    const customTemplatesJson = properties.getProperty('customTemplates');
    const customTemplates = customTemplatesJson ? JSON.parse(customTemplatesJson) : [];
    
    return [...defaultTemplates, ...customTemplates];
  }
  
  function getTemplate(templateId) {
    const templates = getTemplates();
    return templates.find(t => t.id === templateId);
  }
  
  function saveCustomTemplate(template) {
    const properties = PropertiesService.getScriptProperties();
    const customTemplatesJson = properties.getProperty('customTemplates') || '[]';
    const customTemplates = JSON.parse(customTemplatesJson);
    
    const existingIndex = customTemplates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      customTemplates[existingIndex] = template;
    } else {
      customTemplates.push(template);
    }
    
    properties.setProperty('customTemplates', JSON.stringify(customTemplates));
    return template;
  }
  
  return {
    getTemplates,
    getTemplate,
    saveCustomTemplate
  };
})();

// ========================================
// Log Generator Module
// ========================================

const LogGenerator = (() => {
  function generateLog(templateId, formData) {
    const template = TemplateLibrary.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found: ' + templateId);
    }
    
    // Create new document
    const doc = DocumentApp.create(generateFileName(template, formData));
    const body = doc.getBody();
    
    // Add header
    body.setHeadingAttributes(1, DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(template.name).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    
    // Add metadata section
    body.appendParagraph('---').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph('Log Information').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    // Add field values
    template.fields.forEach(field => {
      const value = formData[field.id];
      if (value !== undefined && value !== null && value !== '') {
        const label = field.label + ':';
        body.appendParagraph(label).setBold(true);
        body.appendParagraph(formatValue(value));
      }
    });
    
    // Add footer
    body.appendHorizontalRule();
    const footer = body.appendParagraph('Generated by Smart Field Log Generator');
    footer.setFontSize(10).setForegroundColor('#666666');
    
    // Save and close
    doc.saveAndClose();
    
    return doc.getUrl();
  }
  
  function generateFileName(template, formData) {
    const date = formData.date || new Date().toISOString().split('T')[0];
    const location = formData.location || formData.equipment || 'Log';
    const cleanLocation = location.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    return `${template.name}_${cleanLocation}_${date}`;
  }
  
  function formatValue(value) {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }
  
  return {
    generateLog
  };
})();
