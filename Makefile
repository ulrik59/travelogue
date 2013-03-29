test:
	@TEST=1 ./node_modules/.bin/lab
test-cov: 
	@TEST=1 ./node_modules/.bin/lab -r threshold -t 100
test-cov-html:
	@TEST=1 ./node_modules/.bin/lab -r html -o coverage.html
complexity:
	@TEST=1 ./node_modules/.bin/cr -o complexity.md -f markdown lib

.PHONY: test test-cov test-cov-html complexity

