import * as mockFs from 'mock-fs';
import * as fs from 'fs';
import { expect } from 'chai';
import * as nru from '../../addon/ng2/utilities/route-utils';
import * as ts from 'typescript';
import { InsertChange, RemoveChange } from '../../addon/ng2/utilities/change';
import * as Promise from 'ember-cli/lib/ext/promise';
import * as _ from 'lodash';

const readFile = Promise.denodeify(fs.readFile);

describe('route utils: insertImport', () => {
  const sourceFile = 'tmp/tmp.ts';
  beforeEach(() => {
    let mockDrive = {
      'tmp': {
        'tmp.ts': ''
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('inserts as last import if not present', () => {
    let content = `'use strict'\n import {foo} from 'bar'\n import * as fz from 'fizz';`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      return nru.insertImport(sourceFile, 'Router', '@angular/router');
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(newContent => {
      expect(newContent).to.equal(content + `\nimport { Router } from '@angular/router';`);
    });
  });
  it('does not insert if present', () => {
    let content = `'use strict'\n import {Router} from '@angular/router'`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      return nru.insertImport(sourceFile, 'Router', '@angular/router');
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(newContent => {
      expect(newContent).to.equal(content);
    });
  });
  it('inserts into existing import clause if import file is already cited', () => {
    let content = `'use strict'\n import { foo, bar } from 'fizz'`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      return nru.insertImport(sourceFile, 'baz', 'fizz');
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(newContent => {
      expect(newContent).to.equal(`'use strict'\n import { foo, bar, baz } from 'fizz'`);
    });
  });
  it('understands * imports', () => {
    let content = `\nimport * as myTest from 'tests' \n`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      return nru.insertImport(sourceFile, 'Test', 'tests');
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(newContent => {
      expect(newContent).to.equal(content);
    });
  });
  it('inserts after use-strict', () => {
    let content = `'use strict';\n hello`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      return nru.insertImport(sourceFile, 'Router', '@angular/router');
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(newContent => {
      expect(newContent).to.
      equal(`'use strict';\nimport { Router } from '@angular/router';\n hello`);
    });
  });
});

describe('configureMain', () => {
  const mainFile = 'tmp/main.ts';
  const prefix = `import {bootstrap} from '@angular/platform-browser-dynamic'; \n` +
                   `import { AppComponent } from './app/';\n`;
  const routes = 'routes';
  const routesFile = './routes';
  const routerImport = `import { provideRouter } from '@angular/router';\n` +
                       `import routes from './routes'; \n`;
  beforeEach(() => {
    let mockDrive = {
      'tmp': {
        'main.ts': `import {bootstrap} from '@angular/platform-browser-dynamic'; \n` +
                   `import { AppComponent } from './app/'; \n` +
                   'bootstrap(AppComponent);'
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('adds a provideRouter import if not there already', () => {
    return nru.configureMain(mainFile, routes, routesFile).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + routerImport +
                              'bootstrap(AppComponent, [provideRouter(routes)]);');
    });
  });
  it('does not add a provideRouter import if it exits already', () => {
    return nru.insertImport(mainFile, 'provideRouter', '@angular/router')
    .then(() => {
      return nru.configureMain(mainFile, routes, routesFile);
    }).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + routerImport +
                              'bootstrap(AppComponent, [provideRouter(routes)]);');
    });
  });
  it('does not duplicate import to route.ts ', () => {
    let editedFile = new InsertChange(mainFile, 100, `\nimport routes from './routes';`);
    return editedFile
    .apply()
    .then(() => {
      return nru.configureMain(mainFile, routes, routesFile);
    }).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + `import routes from './routes';\nimport { provideRouter }` +
              ` from '@angular/router'; \nbootstrap(AppComponent, [provideRouter(routes)]);`);
    });
  });
  it('adds provideRouter to bootstrap if absent and no providers array', () => {
    return nru.configureMain(mainFile, routes, routesFile).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + routerImport +
                              'bootstrap(AppComponent, [provideRouter(routes)]);');
    });
  });
  it('adds provideRouter to bootstrap if absent and empty providers array', () => {
    let editFile = new InsertChange(mainFile, 124, ', []');
    return editFile
    .apply()
    .then(() => {
      return nru.configureMain(mainFile, routes, routesFile);
    }).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + routerImport +
                              'bootstrap(AppComponent, [provideRouter(routes)]);');
    });
  });
  it('adds provideRouter to bootstrap if absent and non-empty providers array', () => {
    let editedFile = new InsertChange(mainFile, 124, ', [ HTTP_PROVIDERS ]');
    return editedFile
    .apply()
    .then(() => {
      return nru.configureMain(mainFile, routes, routesFile);
    }).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + routerImport +
                            'bootstrap(AppComponent, [ HTTP_PROVIDERS, provideRouter(routes) ]);');
    });
  });
  it('does not add provideRouter to bootstrap if present', () => {
    let editedFile = new InsertChange(mainFile, 124, ', [ HTTP_PROVIDERS, provideRouter(routes) ]');
    return editedFile
    .apply()
    .then(() => {
      return nru.configureMain(mainFile, routes, routesFile);
    }).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + routerImport +
                           'bootstrap(AppComponent, [ HTTP_PROVIDERS, provideRouter(routes) ]);');
    });
  });
  it('inserts into the correct array', () => {
    let editedFile = new InsertChange(mainFile, 124, ', [ HTTP_PROVIDERS, {provide: [BAR]}]');
    return editedFile
    .apply()
    .then(() => {
      return nru.configureMain(mainFile, routes, routesFile);
    }).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + routerImport +
            'bootstrap(AppComponent, [ HTTP_PROVIDERS, {provide: [BAR]}, provideRouter(routes)]);');
    });
  });
  it('throws an error if there is no or multiple bootstrap expressions', () => {
    let editedFile = new InsertChange(mainFile, 126, '\n bootstrap(moreStuff);');
    return editedFile
    .apply()
    .then(() => {
      return nru.configureMain(mainFile, routes, routesFile);
    }).catch(e =>
      expect(e.message).to.equal('Did not bootstrap provideRouter in' +
                                 ' tmp/main.ts because of multiple or no bootstrap calls')
    );
  });
  it('configures correctly if bootstrap or provide router is not at top level', () => {
    let editedFile = new InsertChange(mainFile, 126, '\n if(e){bootstrap, provideRouter});');
    return editedFile
    .apply()
    .then(() => {
      return nru.configureMain(mainFile, routes, routesFile);
    }).then(() => {
      return readFile(mainFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(prefix + routerImport +
      'bootstrap(AppComponent, [provideRouter(routes)]);\n if(e){bootstrap, provideRouter});');
    });
  });
});

describe('addPathToRoutes', () => {
  const routesFile = 'src/routes.ts';
  var options: {[key: string]: string} = {dir: 'src/app', appRoot: 'src/app',
          component: 'NewRouteComponent', dasherizedName: 'new-route'};

  beforeEach(() => {
    let mockDrive = {
      'src': {
        'routes.ts' : 'export default [];'
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('adds import to new route component if absent', () => {
    return nru.addPathToRoutes(routesFile, options).then(() => {
      return readFile(routesFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(`import { NewRouteComponent } from './app/+new-route';\n`
      + `export default [\n  { path: '/new-route', component: NewRouteComponent }\n];`);
    });
  });
  it('adds provided path to export array', () => {
    return nru.addPathToRoutes(routesFile, _.merge(options, {path: '/provided/path'}))
    .then(() => {
      return readFile(routesFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(`import { NewRouteComponent } from './app/+new-route';\n`
      + `export default [\n  { path: '/provided/path', component: NewRouteComponent }\n];`);
      delete options['path']; // other tests use same object so leave it as is
    });
  });
  it('throws error if multiple export defaults exist', () => {
    let editedFile = new InsertChange(routesFile, 20, 'export default {}');
    return editedFile.apply().then(() => {
      return nru.addPathToRoutes(routesFile, options);
    }).catch(e => {
      expect(e.message).to.equal('Did not insert path in routes.ts because'
                + `there were multiple or no 'export default' statements`);
    });
  });
  it('throws error if no export defaults exists', () => {
    let editedFile = new RemoveChange(routesFile, 0, 'export default []');
    return editedFile.apply().then(() => {
      return nru.addPathToRoutes(routesFile, options);
    }).catch(e => {
      expect(e.message).to.equal('Did not insert path in routes.ts because'
                + `there were multiple or no 'export default' statements`);
    });
  });
  it('adds terminal:true if default flag is set', () => {
    return nru.addPathToRoutes(routesFile, _.merge(options, {isDefault: true}))
    .then(() => {
      return readFile(routesFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(`import { NewRouteComponent } from './app/+new-route';\n`
      + `export default [\n  { path: '/new-route', component: NewRouteComponent, `
      + 'terminal: true }\n];');
      delete options['isDefault'];
    });
  });
  it('does not repeat paths', () => {
    let editedFile = new InsertChange(routesFile, 16,
              `\n  { path: '/new-route', component: NewRouteComponent }\n`);
    return editedFile.apply().then(() => {
      return nru.addPathToRoutes(routesFile, options);
    }).then(() => {
      return readFile(routesFile, 'utf8');
    }).then(content => {
      expect(content).to.equal(`import { NewRouteComponent } from './app/+new-route';\n`
      + `export default [\n  { path: '/new-route', component: NewRouteComponent }\n];`);
    });
  });
});
