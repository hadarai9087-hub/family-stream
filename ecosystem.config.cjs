module.exports = {
  apps: [
    {
      name: "family-stream",
      script: ".next/standalone/server.js",
      instances: process.env.PM2_INSTANCES ? (process.env.PM2_INSTANCES === "max" ? "max" : parseInt(process.env.PM2_INSTANCES, 10)) : 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      kill_timeout: 4000,
    },
  ],
};
