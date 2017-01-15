var gp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gp.task("default",function(){
    gp.src(['./src/base.js','./src/utils.js','./src/ternlight.js','./src/connector.js','./src/action.js','./src/command.js','./src/text.js'])
	  .pipe(concat('ternlight-1.0.1.js'))
	  .pipe(gp.dest('./dist'))
	  .pipe(rename('ternlight-1.0.1.min.js'))
	  .pipe(uglify())
	  .pipe(gp.dest('./dist'));
})