var path = require('path');
var gulp = require('gulp');
var postcss = require('gulp-postcss');

var config = {
	BUILD_DEST: 'build'
};

gulp.task('css', function () {
	var processors = [
		require('postcss-import')(),
		require("postcss-url")({
			url: function (url) {
				if (url.indexOf('/') === 0 ||
					url.indexOf('data:') === 0 ||
					url.indexOf('#') === 0 ||
					url.indexOf('//') !== -1
				) {
					return url;
				}

				return path.join('/assets/images', url);
			}
		}),
		require('autoprefixer')(),
		require('pixrem')
	];

	return gulp.src('css/index.css')
		.pipe(postcss(processors))
		.pipe(gulp.dest(config.BUILD_DEST));
});

gulp.task('default', ['css']);