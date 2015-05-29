var gulp = require('gulp');
var postcss = require('gulp-postcss');

var config = {
	BUILD_DEST: 'build'
};

gulp.task('css', function () {
	var processors = [
		require('postcss-import')(),
		require('autoprefixer')()
	];

	return gulp.src('css/index.css')
		.pipe(postcss(processors))
		.pipe(gulp.dest(config.BUILD_DEST));
});

gulp.task('default', ['css']);
