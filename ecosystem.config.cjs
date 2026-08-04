module.exports = {
  apps: [
    {
      name: 'skillnoxai-prod',
      script: 'dist/index.cjs',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5070
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'skillnox-ai-engine',
      script: 'services/api_service.py',
      cwd: './python-ai',
      interpreter: 'python',
      env: {
        PYTHON_AI_PORT: 8060,
        PYTHON_AI_WORKERS: 4
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G'
    }
  ]
};