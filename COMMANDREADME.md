OBJECTIVE
==========
To get the Angular CLI route generation up to date and to add guard generation to the list of CLI tools, making use of TypeScript AST in changing files.

BACKGROUND
============

The AngularJS CLI tools were made to improve the experience of AngularJS users. With most of the starter templates and scaffolding pre-made, users get a head start. The implicit expectation of users for our CLI is that it must be up to date with changes in AngularJS. This is a challenge in a development environment where changes occur at a fast pace. In particular, the router was update from version 2 to 3 (aliased Vladivostok). The new router came with a whole new and exciting design - routes were separated from components. This design allowed a whole lot of flexibility, including associating multiple with the same route. Guard generation was not present in the CLI but it is necessary for controlling access to pages. Given the frequency of guard usage, it was a good investment to include guard generation.


DETAILED DESIGN
===============

Route Generation:
-----------------
base command `ng generate route route-name`

Build on ember cli generation blueprints but still use AST to make changes in files.

#### Available options: ####

* route: if present, check to see if it matches any parent in `routes.ts` and insert as a child.
  Otherwise, insert as a parent with full route. If absent, take advantage of angular project structure 
  to find out the parent of the current route and insert as child. If no parent exists, insert as parent 
* parent: if present, find parent in `routes.ts` and throw an error if not found. Insert route under this
  parent. if absent, use angular project structure to look for parent. 
* default: set this route as the default route

#### Validations: ####

   * make sure component file exists: accommodate varying inputs
     such as `**/cmpName/cmpName`, `cmpName(.component)?(.ts)?`, `/cmpName` - searches for `cmpName` from `app` root
   * make sure the component is exported
   * make sure no collision occurs in component names in routes.ts

#### Tasks: ####

* Generate routes.ts if absent and import into app entry point
* Bootstrap item in entry point for app
* Import required classes/components
* Add path to `routes.ts` with correct imports

Guard generation:
----------------
base command `ng generate guard guard-name`

Use generation blueprint

#### Available options: ####
 
* can-activate, can-activate-child, can-deactivate: must choose one
* route: route to guard
* name: guard name. If absent, use camelized module name

#### Validations: ####

* guard has not been added already
* route exists

#### Tasks: ####

* Generate guard class with template
* bootstrap guard in app entry point
* import into routes.ts and add guard to route

Major Design Patterns/Requirements 
----------------------------------
* Atomicity: No file is changed until all validations are made. All changes must happen at once.
* Asynchronous flow: If helper function changes a file, it must not be reflected until final 
  stage of changes. No blocking of code for changes.
* Use typescript AST: walk the tree to make precise changes. Avoid rigid extraction of items of 
  the tree so as to support different formats the user might refactor their codes into.
* Solve problem with as decoupled tools as possible (reusable code)

TESTING PLAN
============
Write utility functions that the commands will utilize. This structure of using utility functions will allow thorough unit testing of all public functions. The logic within each command is thus reduced, making end to end testing easier.

WORK ESTIMATES
===============
1. Orientation
2. Write sample angular app
3. Write same app with CLI and read through CLI codebase
4. Read Ember code base to outline how to use commands for our specific purpose/ Learn how to use new router
5. Write Change utils to be used in CLI
6. Start writing util functions that use the AST
7. Write validation codes for route generation
8. Write route command
9. Write guard command
10. Finish thorough unit testing
11. e2e testing and integration with CLI
12. prepare demos/presentations. wrap up

