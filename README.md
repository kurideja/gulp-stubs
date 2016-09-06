# gulp-stubs

This gulp plugin helps you if you want to develop in TDD style.

* Create unit first
* Add a custom marker in the unit where actual code should appear
* Write specs file with `describe` keyword
* Run a gulp task and create stubs

## Installing

Run `npm install --save-dev gulp-stubs`.

## Example gulp task

Create a gulp task:
```
var gulpStubs = require('gulp-stubs');

gulp.task('stubs', function() {
  return gulp.src('someUnit.spec.js')
    .pipe(gulpStubs({
      marker: 'gulp-stubs'
    }));
});
```

## API
gulpStubs(options);
* {string} options.marker - a custom string that defines where methods should be written
* {string?} options.templateUrl - optional url to the template
 
## Template
Passing templateUrl to the plugin allows to get more sophisticated stubs, e.g.:
```
/**
 * @name {unit}#{name}
 */
function {name}() {}
```

* `{unit}` - by default will be replaced with `<name>` from JSDoc `@type {{<name>}}` markup
Else it will be an empty string
* `{name}` - name of described method that is not present in the actual unit

## Workflow

Write a file for SomeUnit: SomeUnit.js:
```
(function() {

  'use strict';
  
  /**
   * @name SomeUnit
   * @type {{SomeUnit}}
   */
  function SomeUnit() {
      var factory = {};
      
      return factory;
      
      // gulp-stubs
  }

})();

```

Write a spec file for SomeUnit: SomeUnit.spec.js:

```
describe('SomeUnit ->', function() {
    describe('sayHello ->', function() {
        describe('sub-description', function() {
            it('should return `hello`', function() {
                expect(SomeUnit.sayHello()).toBe('hello');
            });
        });
    });
});
```

Now run `gulp stubs` and see how method `sayHello` appears in the unit.

## Contributing
This was a YDD (Your Developer Day) project at my work.
Feel free to contribute by PR's or opening issues.
