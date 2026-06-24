module.exports = {
  apps: [
    {
      name: "eco-hub-saas",
      script: "./server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
        DATA_DIR: "/var/opt/eco-hub-data",
        JWT_SECRET: "CHANGEZ-MOI-avec-une-vraie-cle-secrete-en-production-" + Date.now()
      }
    }
  ]
};
