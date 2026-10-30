// Configuração do Cucumber: onde estão os cenários e os passos.
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/support/**/*.js', 'features/step_definitions/**/*.js'],
    format: ['pretty'],
  },
};
