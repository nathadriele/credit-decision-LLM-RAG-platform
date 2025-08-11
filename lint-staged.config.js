module.exports = {
  // TypeScript and JavaScript files
  '**/*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    () => 'npm run type-check',
  ],
  
  // JSON files
  '**/*.json': [
    'prettier --write',
  ],
  
  // Markdown files
  '**/*.md': [
    'prettier --write',
  ],
  
  // YAML files
  '**/*.{yml,yaml}': [
    'prettier --write',
  ],
  
  // CSS and SCSS files
  '**/*.{css,scss,sass}': [
    'prettier --write',
  ],
  
  // Package.json files
  '**/package.json': [
    'prettier --write',
    'npm audit --audit-level=high',
  ],
  
  // Terraform files
  '**/*.tf': [
    'terraform fmt',
  ],
  
  // Docker files
  '**/Dockerfile*': [
    'hadolint',
  ],
  
  // Environment files
  '**/.env*': [
    () => 'echo "⚠️  Remember to never commit real secrets in .env files!"',
  ],
};
