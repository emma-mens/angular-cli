const Blueprint = require('ember-cli/lib/models/blueprint');
const getFiles = Blueprint.prototype.files;
const path = require('path');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const util = require('../../utilities/route-utils');
const _ = require('lodash');
const fs = require('fs');
const SilentError = require('silent-error');

module.exports = {
  description: 'Generates a route/guard and template',

  files: function() {
    var fileList = getFiles.call(this);
    if (this.project && fs.existsSync(path.join(this.project.root, 'src/routes.ts'))) {
      return [];
    }
    return fileList;
  },

  fileMapTokens: function() {
    return { 
      __path__: () => 'src'
    };
  },

  normalizeEntityName: function(entityName) {
    var parsedPath = dynamicPathParser(this.project, entityName);
    this.dynamicPath = parsedPath;
    return entityName;
  },

  afterInstall: function(options) {
    const mainFile = path.join(this.project.root, 'src/main.ts');
    const routesFile = path.join(this.project.root, 'src/routes.ts');
    return util.configureMain(mainFile, 'routes', './routes').then(() => {
      return this._locals(options);
    }).then(names => {
      
      if (process.env.PWD.indexOf('src/app') === -1) {
        return Promise.reject(new SilentError('New route must be within app'));
      }
      // setup options needed for adding path to routes.ts
      var pathOptions = {}
      pathOptions.isDefault = options.default;
      pathOptions.route = options.path;
      pathOptions.component = `${names.classifiedModuleName}Component`;
      pathOptions.dasherizedName = names.dasherizedModuleName;
      pathOptions = _.merge(pathOptions, this.dynamicPath);  

      var newRoutePath = options.taskOptions.args[1];
      if (!newRoutePath) {
        throw new SilentError('Please provide new route\'s name');
      }
      var file = util.resolveComponentPath(this.project.root, process.env.PWD, newRoutePath);
      var component = pathOptions.component;
      // confirm that there is an export of the component in componentFile
      if (!util.confirmComponentExport(file, component)) {
        throw new SilentError(`Please add export for '${component}' to '${file}'`)
      }

      pathOptions.component = util.resolveImportName(component, path.join(this.project.root, 'src/routes.ts'));
      
      return util.addPathToRoutes(routesFile, pathOptions);
    });
  }
}
