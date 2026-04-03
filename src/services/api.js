const API_BASE = process.env.REACT_APP_BACKEND_URL;

const apiService = {

  // ------------------------
  // HEALTH CHECK
  // ------------------------
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);

      if (!res.ok) throw new Error("Health check failed");

      const data = await res.json();

      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ------------------------
  // CHAT
  // ------------------------
  async sendMessage(query) {
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      });

      if (!res.ok) {
        throw new Error(`Chat API failed: ${res.status}`);
      }

      const data = await res.json();

      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ------------------------
  // LIST DOCUMENTS
  // ------------------------
  async listDocuments() {
    try {
      const res = await fetch(`${API_BASE}/list_docs`);

      if (!res.ok) throw new Error("Failed to fetch documents");

      const data = await res.json();

      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ------------------------
  // DELETE DOCUMENT
  // ------------------------
  async deleteDocument(filename) {
    try {
      const res = await fetch(
        `${API_BASE}/delete_doc?filename=${encodeURIComponent(filename)}`,
        {
          method: "DELETE"
        }
      );

      if (!res.ok) throw new Error("Delete failed");

      const data = await res.json();

      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ------------------------
  // UPLOAD DOCUMENT
  // ------------------------
  async uploadDocument(file, onProgress) {
    try {

      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {

        xhr.open("POST", `${API_BASE}/upload_doc`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded * 100) / event.total);
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);

            resolve({
              success: true,
              data: response
            });
          } catch {
            reject({
              success: false,
              error: "Invalid response from server"
            });
          }
        };

        xhr.onerror = () => {
          reject({
            success: false,
            error: "Upload failed"
          });
        };

        xhr.send(formData);

      });

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ------------------------
  // SHAREPOINT: GET SITE ID
  // ------------------------
    async getSiteId(hostname, siteName) {
    try {
      const res = await fetch(`${API_BASE}/get_site_id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          hostname: hostname,
          site_name: siteName
        })
      });

      if (!res.ok) {
        throw new Error(`Get Site ID failed: ${res.status}`);
      }

      const data = await res.json();

      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // ------------------------
  // SHAREPOINT: INGEST
  // ------------------------
  async ingestSharePoint(siteId, folderPath) {
    try {
      const res = await fetch(
        `${API_BASE}/ingest_sharepoint?site_id=${encodeURIComponent(siteId)}&folder_path=${encodeURIComponent(folderPath)}`,
        {
          method: "POST"
        }
      );

      if (!res.ok) {
        throw new Error(`SharePoint ingestion failed: ${res.status}`);
      }

      const data = await res.json();

      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default apiService;