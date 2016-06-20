const Blueprint = require('ember-cli/lib/models/blueprint');
const getFiles = Blueprint.prototype.files;
const path = require('path');
const fs = require('fs');
const dynamicPathParser = require('../../utilities/dynamic-path-parser');
const util = require('../../utilities/route-utils');
const SilentError = require('silent-error');

module.exports = {
  description: 'Generates a route and template',

  availableOptions: [
    { name: 'default', type: Boolean, default: false },
    { name: 'route', type: String },
    { name: 'parent', type: String, default: '' },
    { name: 'outlet', type: Boolean, default: false }
  ],

  beforeInstall: function(options){
    if (process.env.PWD.indexOf('src/app') === -1) {
      throw new SilentError('New route must be within app');
    }
    this._locals(options)
    .then(names => {
      var route = options.route || this.dynamicPath.dir.replace(this.dynamicPath.appRoot, '')
                                   + `/+${names.dasherizedModuleName}`;
      // setup options needed for adding path to routes.ts
      this.pathOptions = {
        isDefault: options.default,
        route: route,
        parent: options.parent,
        outlet: options.outlet,
        component: `${names.classifiedModuleName}Component`,
        dasherizedName: names.dasherizedModuleName,
        mainFile: path.join(this.project.root, 'src/main.ts'),
        routesFile: path.join(this.project.root, 'src/routes.ts')
      };

      var component = this.pathOptions.component;
      if (!util.confirmComponentExport(file, component)) {
        throw new SilentError(`Please add export for '${component}' to '${file}'`);
      }
    });
    // confirm that there is an export of the component in componentFile
    try {
      var file = util.resolveComponentPath(this.project.root, process.env.PWD, this.newRoutePath);
    } catch (e) {
      throw new SilentError(e);
    }
  },

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
    if (!entityName) {
      throw new SilentError('Please provide new route\'s name');
    }
    this.dynamicPath = dynamicPathParser(this.project, entityName);
    this.newRoutePath = entityName;
    return entityName;
  },

  afterInstall: function() {
    return util.applyChanges(util.configureMain(this.pathOptions.mainFile, 'routes', './routes'))
    .then(() => {      
      return util.applyChanges(util.addPathToRoutes(this.pathOptions.routesFile, this.pathOptions));
    }).catch(e => {
      throw new SilentError(e.message);
    })
  }
}
