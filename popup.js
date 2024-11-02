document.addEventListener('DOMContentLoaded', function() {
    const extractBtn = document.getElementById('extractBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const urlInput = document.getElementById('urlInput');
    const resultDiv = document.getElementById('result');
  
    let currentVideoUrl = null;
  
    // Helper function to update download button state
    function updateDownloadButton(state) {
      const buttonText = downloadBtn.querySelector('.button-text');
      const spinner = downloadBtn.querySelector('.spinner');
      
      switch(state) {
        case 'ready':
          downloadBtn.className = '';
          buttonText.textContent = 'Download Video';
          spinner.classList.add('hidden');
          downloadBtn.disabled = false;
          break;
        case 'downloading':
          downloadBtn.className = 'downloading';
          buttonText.textContent = 'Downloading...';
          spinner.classList.remove('hidden');
          downloadBtn.disabled = true;
          break;
        case 'completed':
          downloadBtn.className = 'completed';
          buttonText.textContent = 'Downloaded!';
          spinner.classList.add('hidden');
          downloadBtn.disabled = true;
          setTimeout(() => updateDownloadButton('ready'), 2000);
          break;
        case 'error':
          downloadBtn.className = '';
          buttonText.textContent = 'Download Failed';
          spinner.classList.add('hidden');
          downloadBtn.disabled = false;
          setTimeout(() => updateDownloadButton('ready'), 2000);
          break;
      }
    }
  
    extractBtn.addEventListener('click', async () => {
      const postUrl = urlInput.value.trim();
      if (!postUrl) {
        resultDiv.textContent = 'Please enter a Reddit post URL';
        resultDiv.classList.remove('hidden');
        return;
      }
  
      try {
        extractBtn.disabled = true;
        extractBtn.textContent = 'Extracting...';
        
        const jsonUrl = `${postUrl}.json`;
        const response = await fetch(jsonUrl, {
          headers: {
            'User-Agent': 'Chrome Extension v1.0'
          }
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch post data');
        }
  
        const data = await response.json();
        const videoUrl = data[0]?.data?.children[0]?.data?.media?.reddit_video?.fallback_url;
  
        if (videoUrl) {
          currentVideoUrl = videoUrl;
          resultDiv.textContent = videoUrl;
          resultDiv.classList.remove('hidden');
          copyBtn.classList.remove('hidden');
          downloadBtn.classList.remove('hidden');
          updateDownloadButton('ready');
        } else {
          resultDiv.textContent = 'No video found in this post';
          resultDiv.classList.remove('hidden');
          copyBtn.classList.add('hidden');
          downloadBtn.classList.add('hidden');
        }
      } catch (error) {
        resultDiv.textContent = `Error: ${error.message}`;
        resultDiv.classList.remove('hidden');
        copyBtn.classList.add('hidden');
        downloadBtn.classList.add('hidden');
      } finally {
        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract Video URL';
      }
    });
  
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(currentVideoUrl).then(() => {
        const buttonText = copyBtn.querySelector('.button-text');
        buttonText.textContent = 'Copied!';
        setTimeout(() => {
          buttonText.textContent = 'Copy URL';
        }, 1500);
      });
    });
  
    downloadBtn.addEventListener('click', async () => {
      if (!currentVideoUrl) return;
  
      try {
        updateDownloadButton('downloading');
        
        const videoName = `reddit_video_${Date.now()}.mp4`;
        
        chrome.downloads.download({
          url: currentVideoUrl,
          filename: videoName,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            updateDownloadButton('error');
          } else {
            // Listen for download completion
            chrome.downloads.onChanged.addListener(function downloadListener(delta) {
              if (delta.id === downloadId && delta.state) {
                if (delta.state.current === 'complete') {
                  updateDownloadButton('completed');
                  chrome.downloads.onChanged.removeListener(downloadListener);
                } else if (delta.state.current === 'interrupted') {
                  updateDownloadButton('error');
                  chrome.downloads.onChanged.removeListener(downloadListener);
                }
              }
            });
          }
        });
      } catch (error) {
        console.error('Download error:', error);
        updateDownloadButton('error');
      }
    });
  });