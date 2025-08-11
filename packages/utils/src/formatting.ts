// =============================================================================
// FORMATTING UTILITIES - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

export const FormatUtils = {
  // Format currency
  formatCurrency: (amount: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  // Format percentage
  formatPercentage: (value: number, decimals = 2): string => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  // Format phone number
  formatPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  },

  // Format SSN
  formatSSN: (ssn: string): string => {
    const cleaned = ssn.replace(/\D/g, '');
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
    }
    return ssn;
  },

  // Mask SSN for display
  maskSSN: (ssn: string): string => {
    if (ssn.length >= 4) {
      return `***-**-${ssn.slice(-4)}`;
    }
    return '***-**-****';
  },

  // Format application number
  formatApplicationNumber: (id: string): string => {
    const timestamp = Date.now().toString().slice(-8);
    const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `APP-${timestamp}-${randomSuffix}`;
  },

  // Capitalize first letter
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  },
};
