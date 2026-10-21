module.exports = {
  apps: [
    {
      name: "yuwaindiabackend",
      script: "./index.js",
      instances: "max", // Utilizes all available CPU cores on the VPS
      exec_mode: "cluster",
      max_memory_restart: "1G", // Auto-restarts worker if memory exceeds 1GB
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
