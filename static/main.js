(function ($, undefined){

    'use strict';

    //libs version-url object
    var LOCAL_LIBS_OBJ = {
            zepto : {
                "1.0.1" : "libs/zepto-1.0.1.js"
            },
            jquery : {
                "1.10.1" : "libs/jquery-1.10.1.js",
                "2.0.3" : "libs/jquery-2.0.3.js",
                "2.1.1" : "libs/jquery-2.1.1.js"
            }
        },
        GITHUB_LIBS_OBJ = {
            zepto : {},
            jquery : {}
        },
    //will cache selectors here
        $RESULTS,
        $STATIC_LIB_PROPS_TABLE,
        $SHARED_LIB_PROPS_TABLE,
        $STATIC_LIB_PROPS_TBODY,
        $SHARED_LIB_PROPS_TBODY,
        $STATIC_LIB_PROPS_COUNTER,
        $SHARED_LIB_PROPS_COUNTER,
        $SCRIPTS_SANDBOX,
        $COMPARE_CONTROL,
        $ZEPTO_VERSION_CONTROL,
        $JQUERY_VERSION_CONTROL,
        $STATIC_METHODS_CONTROL,
        $ESSSENCE_METHODS_CONTROLS,
        $DIFF_METHODS_CONTROL,
        $COMMON_METHOD_CONTROL,
    //Cache no content html
        NO_TABLE_CONTENT_HTML,
    //cache libs methods
        RESULTS_CACHE = {};

    function getScriptURL(lib, version) {
        return GITHUB_LIBS_OBJ[lib][version];
    }

    function setScriptToSandbox(scriptURL) {
        var deferred = $.Deferred(),
            $sandboxDocument = $SCRIPTS_SANDBOX.contents(),
            script = $sandboxDocument.get(0).createElement('script');

        $sandboxDocument.find('head').append(script);
        script.src = scriptURL;
        script.onload = deferred.resolve;

        return deferred;
    }

    function removeScriptFromSandbox(libObjectName) {
        $SCRIPTS_SANDBOX.get(0).contentWindow[libObjectName] = null;
    }

    function getMethods(essence) {
        var methods = [],
            any;

        for (any in essence) {
            methods.push(any);
        }

        return methods.sort();//sort by ASCII table
    }

    function getjQueryMethods() {
        var iframeGlobalContext = $SCRIPTS_SANDBOX.get(0).contentWindow,
            staticMethods = getMethods(iframeGlobalContext.jQuery) || [],
            sharedMethods = getMethods(iframeGlobalContext.jQuery()) || [];

        return {
            staticMethods : staticMethods,
            sharedMethods : sharedMethods
        }
    }

    function getZeptoMethods() {
        var iframeGlobalContext = $SCRIPTS_SANDBOX.get(0).contentWindow,
            staticMethods = getMethods(iframeGlobalContext.Zepto) || [],
            sharedMethods = getMethods(iframeGlobalContext.Zepto()) || [];

        return {
            staticMethods : staticMethods,
            sharedMethods : sharedMethods
        }
    }

    function mergeLibsMethods(jqueryMethods, zeptoMethods) {
        var staticMethods = {},
            sharedMethods = {},
            i,
            l,
            method,
            merged,
            inZepto;

        //map jQuery static methods
        jqueryMethods.staticMethods.forEach(function (method) {
            inZepto = zeptoMethods.staticMethods.indexOf(method) > -1;
            staticMethods[method] = {
                jquery: true,
                zepto : inZepto
            }
        });

        //map Zepto and not jQuery static methods
        jqueryMethods.staticMethods.forEach(function (method) {
            merged = staticMethods.hasOwnProperty(method);
            if (!merged) {
                staticMethods[method] = {
                    jquery: false,
                    zepto : true
                }
            }
        });

        //map jQuery shared methods
        jqueryMethods.sharedMethods.forEach(function (method) {
            inZepto = zeptoMethods.sharedMethods.indexOf(method) > -1;
            sharedMethods[method] = {
                jquery: true,
                zepto : inZepto
            }
        });

        //map Zepto and not jQuery shared methods
        zeptoMethods.sharedMethods.forEach(function (method) {
            merged = sharedMethods.hasOwnProperty(method);
            if (!merged) {
                sharedMethods[method] = {
                    jquery: false,
                    zepto : true
                }
            }
        });

        return {
            staticMethods : staticMethods,
            sharedMethods : sharedMethods
        };
    }

    function renderRowResult(method, methodObject, renderBody, compareOptions) {
        var isStaticMethod = renderBody === $STATIC_LIB_PROPS_TBODY,
            renderCommon = compareOptions._common,
            renderDiff = compareOptions._diff,
            isMethodCommon = methodObject.jquery === methodObject.zepto,
            tableRow = $('<tr>').addClass('method-row').attr('data-is-static', Number(isStaticMethod)),
            methodCell = $('<td>').addClass('method-cell cell').html(method),
            jQueryResultCell = $('<td>').addClass('jquery-cell cell'),
            ZeptoResultCell = $('<td>').addClass('zepto-cell cell'),
            rowIsHidden = (renderDiff && isMethodCommon) || (renderCommon && !isMethodCommon);

        if (rowIsHidden) {
            tableRow.addClass('hidden');
        } else {
            tableRow.addClass('visible');
        }

        if (methodObject.jquery) {
            jQueryResultCell.html('+');
        } else {
            jQueryResultCell.html('-');
        }

        if (methodObject.zepto) {
            ZeptoResultCell.html('+');
        } else {
            ZeptoResultCell.html('-');
        }

        tableRow
            .attr('data-is-common', Number(isMethodCommon))
            .append(methodCell, jQueryResultCell, ZeptoResultCell);

        renderBody.append(tableRow)

    }

    function renderStaticResults(methodsObject, compareOptions) {
        var methodsNamesArray = Object.keys(methodsObject);

        methodsNamesArray.forEach(function (method) {
            renderRowResult(method, methodsObject[method], $STATIC_LIB_PROPS_TBODY, compareOptions);
        });

        $STATIC_LIB_PROPS_COUNTER.html(methodsNamesArray.length);
    }

    function renderSharedResults(methodsObject, compareOptions) {
        var methodsNamesArray = Object.keys(methodsObject);

        methodsNamesArray.forEach(function (method) {
            renderRowResult(method, methodsObject[method], $SHARED_LIB_PROPS_TBODY, compareOptions);
        });

        $SHARED_LIB_PROPS_COUNTER.html(methodsNamesArray.length);
    }

    function disableControls() {
        $(':input').prop('disabled', true);
    }

    function enableControls() {
        $(':input').prop('disabled', false);
    }

    function removeContent() {
        $STATIC_LIB_PROPS_TBODY.empty();
        $SHARED_LIB_PROPS_TBODY.empty();
    }

    function showRenderedResults() {
        $RESULTS.show();
    }

    function hideRenderedResults() {
        $RESULTS.hide();
    }

    function setLibVersionsToControl(libName) {
        var $libControl;

        if (libName === 'jquery') {
            $libControl = $JQUERY_VERSION_CONTROL;
        } else if (libName == 'zepto') {
            $libControl = $ZEPTO_VERSION_CONTROL;
        }

        $libControl.empty();

        $.each(GITHUB_LIBS_OBJ[libName], function (version, url) {

            var $option = $('<option>', {
                value : url,
                html : version
            });

            if (!url) {
                $option.prop('disabled', true);
            }

            $libControl.append($option)
        });

    }

    function getLibVersions(libName, repoOwner, repoName) {
        return $.ajax({
            url : 'https://api.github.com/repos/' + repoOwner + '/' + repoName +  '/tags',
            type : 'get'
        }).done(function (tagsArray) {
            //data is array
            var i = 0,
                tag,
                libURL,
                l;

            if (!tagsArray || !tagsArray[0]) {
                GITHUB_LIBS_OBJ[libName] = LOCAL_LIBS_OBJ[libName];
                return;
            }

            l = tagsArray.length;

            for (i; i < l; i++) {

                tag = tagsArray[i];
                libURL = '';

                if (libName === 'jquery') {
                    //We can't get jQuery lib file from github, it stores only sources file for build
                    //But there is CDN http://code.jquery.com/jquery/ which files named as tags.
                    libURL = 'http://code.jquery.com/jquery-' + tag.name + '.js';
                } else if (libName === 'zepto' && i === 0) {
                    //We cangrab just last Zepto version, which is the first (last created) tag
                    //If there is any way to grab older zepto versions, message me
                    libURL = 'http://zeptojs.com/zepto.js';
                }

                GITHUB_LIBS_OBJ[libName][tag.name] = libURL;
            }

        }).fail(function () {
            GITHUB_LIBS_OBJ[libName] = LOCAL_LIBS_OBJ[libName];
        }).always(function () {
            setLibVersionsToControl(libName);
        });
    }

    function renderResults (resultsObject, compareOptions) {

        removeContent();

        renderStaticResults(resultsObject.staticMethods, compareOptions);
        renderSharedResults(resultsObject.sharedMethods, compareOptions);

        showRenderedResults();

    }

    function getjQueryVersions() {
        return getLibVersions('jquery', 'jquery', 'jquery');
    }

    function getZeptoVersions() {
        return getLibVersions('zepto', 'madrobby', 'zepto');
    }

    function hideCommonMethods() {
        $('.method-row').filter('[data-is-common="1"]').addClass('hidden').removeClass('visible');
    }

    function showCommonMethods() {
        $('.method-row').filter('[data-is-common="1"]').removeClass('hidden').addClass('visible');
    }

    function hideDiffMethods() {
        $('.method-row').filter('[data-is-common="0"]').addClass('hidden').removeClass('visible');
    }

    function showDiffMethods() {
        $('.method-row').filter('[data-is-common="0"]').removeClass('hidden').addClass('visible');
    }

    $(function () {

        $RESULTS = $('#results');

        hideRenderedResults();

        $STATIC_LIB_PROPS_TABLE = $('.static-table');
        $SHARED_LIB_PROPS_TABLE = $('.shared-table');
        $STATIC_LIB_PROPS_TBODY = $('#static-tbody');
        $SHARED_LIB_PROPS_TBODY = $('#shared-tbody');
        $STATIC_LIB_PROPS_COUNTER = $STATIC_LIB_PROPS_TABLE.find('.methods-counter'),
        $SHARED_LIB_PROPS_COUNTER = $SHARED_LIB_PROPS_TABLE.find('.methods-counter'),
        $SCRIPTS_SANDBOX = $('#sandbox');
        $ZEPTO_VERSION_CONTROL = $('#zepto-versions');
        $JQUERY_VERSION_CONTROL = $('#jquery-versions');
        $STATIC_METHODS_CONTROL = $('#static-methods');
        $ESSSENCE_METHODS_CONTROLS = $('#shared-methods');
        $DIFF_METHODS_CONTROL = $('#diff-methods');
        $COMMON_METHOD_CONTROL = $('#common-methods');
        $COMPARE_CONTROL = $('#compare-control');
        NO_TABLE_CONTENT_HTML = $STATIC_LIB_PROPS_TBODY.html();


        //set default options
        $STATIC_METHODS_CONTROL.prop('checked', true);
        $ESSSENCE_METHODS_CONTROLS.prop('checked', true);
        $DIFF_METHODS_CONTROL.prop('checked', false);
        $COMMON_METHOD_CONTROL.prop('checked', false);

        //disable controls, will enabled after libs version will loaded
        disableControls();

        //set methods controls via checkboxes handler
        $(':checkbox').on('change', function () {
            var controlNode = this;

            if (controlNode === $DIFF_METHODS_CONTROL.get(0)) {
                if ($DIFF_METHODS_CONTROL.prop('checked')) {
                    $COMMON_METHOD_CONTROL.prop('checked', false);
                    showDiffMethods();
                    hideCommonMethods();
                } else {
                    showCommonMethods();
                }
            } else if (controlNode === $COMMON_METHOD_CONTROL.get(0)) {
                if ($COMMON_METHOD_CONTROL.prop('checked')) {
                    $DIFF_METHODS_CONTROL.prop('checked', false);
                    showCommonMethods();
                    hideDiffMethods();
                } else {
                    showDiffMethods();
                }
            } else if (controlNode === $STATIC_METHODS_CONTROL.get(0)) {
                if ($STATIC_METHODS_CONTROL.prop('checked')) {
                    $STATIC_LIB_PROPS_TABLE.show();
                } else if ($ESSSENCE_METHODS_CONTROLS.prop('checked')) {
                    $STATIC_LIB_PROPS_TABLE.hide();
                } else {
                    $STATIC_METHODS_CONTROL.prop('checked', true);
                }
            } else if (controlNode === $ESSSENCE_METHODS_CONTROLS.get(0)) {
                if ($ESSSENCE_METHODS_CONTROLS.prop('checked')) {
                    $SHARED_LIB_PROPS_TABLE.show();
                } else if ($STATIC_METHODS_CONTROL.prop('checked')) {
                    $SHARED_LIB_PROPS_TABLE.hide();
                } else {
                    $ESSSENCE_METHODS_CONTROLS.prop('checked', true);
                }
            }
        });

        //submit handler, it starts libs testing for methods
        $('.main-form').on('submit', function (e) {

            e.preventDefault();

            var zeptoURL = $ZEPTO_VERSION_CONTROL.val(),
                jqueryURL = $JQUERY_VERSION_CONTROL.val(),
                cacheKey = zeptoURL + '|' + jqueryURL,
                compareOptions = {
                    _diff : $DIFF_METHODS_CONTROL.prop('checked'),
                    _common : $COMMON_METHOD_CONTROL.prop('checked')
                },
                jqueryMethods,
                zeptoMethods,
                jqueryDeferred,
                zeptoDeferred;


            removeScriptFromSandbox('jQuery');
            removeScriptFromSandbox('Zepto');
            removeScriptFromSandbox('$');

            disableControls();

            $COMPARE_CONTROL.addClass('loading');

            if (RESULTS_CACHE[cacheKey]) {

                renderResults(RESULTS_CACHE[cacheKey], compareOptions);

                enableControls();

                setTimeout(function () {
                    $COMPARE_CONTROL.removeClass('loading');
                }, 200);

            } else {

                jqueryDeferred = setScriptToSandbox(jqueryURL).done(function () {
                    jqueryMethods = getjQueryMethods();
                });

                zeptoDeferred = setScriptToSandbox(zeptoURL).done(function () {
                    zeptoMethods = getZeptoMethods();
                });

                $.when(jqueryDeferred, zeptoDeferred).done(function () {

                    var resultsObject = mergeLibsMethods(jqueryMethods, zeptoMethods);

                    RESULTS_CACHE[cacheKey] = resultsObject;

                    renderResults(resultsObject, compareOptions);

                }).always(function () {
                    enableControls();
                    setTimeout(function () {
                        $COMPARE_CONTROL.removeClass('loading');
                    }, 200);
                });

            }

        });

        //Try loading jQuery/Zepto libs version from GitHub
        $.when(getjQueryVersions(), getZeptoVersions()).always(enableControls);

    });

})(jQuery);
