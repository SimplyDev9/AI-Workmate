const API_BASE = process.env.REACT_APP_BACKEND_URL;

const apiService = {

  // ------------------------
  // HEALTH CHECK
  // ------------------------
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
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
      const data = await res.json();

      return {
        success: true,
        data: data
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
          const response = JSON.parse(xhr.responseText);

          resolve({
            success: true,
            data: response
          });
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
  }

};

export default apiService;