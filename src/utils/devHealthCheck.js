/**
 * Dev Health Check Utility
 * Confirms client-server connectivity on app load and logs results to console.
 */
export const initDevHealthCheck = async () => {
  try {
    const apiUrl = '/api/health';
    const response = await fetch(apiUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log(
        '%c[Rural Health Link]%c Backend connected successfully!',
        'background: #14B8A6; color: #0B1220; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
        'color: #10B981; font-weight: bold; margin-left: 6px;',
        data
      );
    } else {
      console.warn(
        '%c[Rural Health Link]%c Health check returned non-200 status:',
        'background: #F59E0B; color: #0B1220; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
        'color: #F59E0B; font-weight: bold; margin-left: 6px;',
        response.status,
        response.statusText
      );
    }
  } catch (err) {
    console.warn(
      '%c[Rural Health Link]%c Unable to reach backend server at /api/health.',
      'background: #F43F5E; color: #FFFFFF; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
      'color: #FDA4AF; margin-left: 6px;',
      err.message
    );
  }
};

export default initDevHealthCheck;
