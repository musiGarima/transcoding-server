const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

const BASE_URL = 'https://livestreaminggb.azurewebsites.net'


app.use(express.json());

let ids = '';

app.post('/test', async (req, res) => {
  try {
    const { id, streamPath } = req.body;
    ids = id;

    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const rtmpUrl = `rtmp://${BASE_URL}/${streamPath}`;

    const ffmpegProcess = spawn('ffmpeg', [
      '-i', rtmpUrl,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
      '-c:a', 'aac', '-b:a', '128k',
      '-hls_time', '4',
      '-hls_list_size', '6',
      '-hls_flags', 'delete_segments',
      '-hls_segment_filename', `${outputDir}/segment%d.ts`,
      `${outputDir}/index.m3u8`
    ]);

    ffmpegProcess.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout: ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
      console.error(`FFmpeg stderr: ${data}`);
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`FFmpeg process closed with code ${code}`);
      if (code === 0) {
        res.send(`HLS playlist generated for ID: ${id}`);
      } else {
        res.status(500).send(`Error generating HLS playlist for ID: ${id}`);
      }
    });
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    res.status(500).send('Internal server error');
  }
});

app.use('/hls', express.static(path.join(__dirname, 'output')));

const PORT = process.env.PORT || 3500;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
