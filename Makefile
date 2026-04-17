NODE_MODULES_STAMP := node_modules/.package-lock-stamp
BOWER_COMPONENTS_STAMP := bower_components/.bower-install-stamp
BIN := ./node_modules/.bin
PRETTIER := $(BIN)/prettier
ESLINT := $(BIN)/eslint
MOCHA := $(BIN)/mocha
NYC := $(BIN)/nyc
SASS := $(BIN)/sass
BOWER := $(BIN)/bower

FORMAT_FILES := \
	README.md \
	package.json \
	bower.json \
	asia.html \
	index.html \
	jsbayes-viz.js \
	test/jsbayes-viz.js \
	index.scss \
	jsbayes-viz.scss \
	.prettierrc.json \
	eslint.config.js

JS_FILES := \
	jsbayes-viz.js \
	test/jsbayes-viz.js

SCSS_TARGETS := \
	index.css \
	jsbayes-viz.css

$(NODE_MODULES_STAMP): package.json package-lock.json
	npm ci
	touch $(NODE_MODULES_STAMP)

$(BOWER_COMPONENTS_STAMP): bower.json $(NODE_MODULES_STAMP)
	$(BOWER) install
	mkdir -p bower_components
	touch $(BOWER_COMPONENTS_STAMP)

install: $(NODE_MODULES_STAMP) $(BOWER_COMPONENTS_STAMP)

clean:
	rm -rf node_modules bower_components coverage .nyc_output

format: $(NODE_MODULES_STAMP)
	$(PRETTIER) --write $(FORMAT_FILES)

lint: $(NODE_MODULES_STAMP)
	$(ESLINT) $(JS_FILES)

test: $(NODE_MODULES_STAMP)
	$(MOCHA) --reporter spec

coverage: $(NODE_MODULES_STAMP)
	$(NYC) --reporter=text --reporter=lcov --report-dir coverage $(MOCHA) --reporter spec

build: $(NODE_MODULES_STAMP) $(SCSS_TARGETS)

index.css: index.scss $(NODE_MODULES_STAMP)
	$(SASS) --no-source-map --style=expanded $< $@

jsbayes-viz.css: jsbayes-viz.scss $(NODE_MODULES_STAMP)
	$(SASS) --no-source-map --style=expanded $< $@

.PHONY: install clean format lint test coverage build
