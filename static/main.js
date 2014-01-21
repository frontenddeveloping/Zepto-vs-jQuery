(function ($, undefined){

    /*
    *   TODO
    *       add methods counter
    *       preloader
     *      load scripts from git hub API
    * */


    //libs version-url object
    var LOCAL_LIBS_OBJ = {
            zepto : {
                "1.0.1" : "libs/zepto-1.0.1.js"
            },
            jquery : {
                "1.10.1" : "libs/jquery-1.10.1.js",
                "2.0.3" : "libs/jquery-2.0.3.js"
            }
        },
        GITHUB_LIBS_OBJ = {
            zepto : {},
            jquery : {}
        };

    //will cache selectors here
    var $RESULTS,
        $STATIC_LIB_PROPS_TBODY,
        $SHARED_LIB_PROPS_TBODY,
        $STATIC_LIB_PROPS_TABLE,
        $SHARED_LIB_PROPS_TABLE,
        $SCRIPTS_SANDBOX,
        $COMPARE_CONTROL,
        $ZEPTO_VERSION_CONTROL,
        $JQUERY_VERSION_CONTROL,
        $STATIC_METHODS_CONTROL,
        $ESSSENCE_METHODS_CONTROLS,
        $DIFF_METHODS_CONTROL,
        $COMMON_METHOD_CONTROL;

    //Helper functions
    function inArray(value, array){
        if ([].indexOf) {
            return array.indexOf(value);
        } else {
            for (var i = 0, l = array.length; i < l; i ++) {
                if (array[i] === value) {
                    return i;
                }
            }
        }

        return -1;
    }

    //method for script loading
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
        var iframeGlobalContext = $SCRIPTS_SANDBOX.get(0).contentWindow;

        if (iframeGlobalContext[libObjectName]) {
            iframeGlobalContext[libObjectName] = null;
            delete iframeGlobalContext[libObjectName];
        }
    }

    function getMethods(essence) {
        var methods = [],
            any;

        for (any in essence) {
            methods.push(any);
        }

        return methods.sort();//sort by ASCII table
    }

    function getjQueryMethods(options) {
        options = options || {};
        var staticCheck = options._static,
            sharedCheck = options._essence,
            iframeGlobalContext = $SCRIPTS_SANDBOX.get(0).contentWindow,
            staticMethods = staticCheck ? getMethods(iframeGlobalContext.jQuery.fn) : [],
            sharedMethods = sharedCheck ? getMethods(iframeGlobalContext.jQuery()) : [];

        return {
            staticMethods : staticMethods,
            sharedMethods : sharedMethods
        }
    }

    function getZeptoMethods(options) {
        options = options || {};
        var staticCheck = options._static,
            sharedCheck = options._essence,
            iframeGlobalContext = $SCRIPTS_SANDBOX.get(0).contentWindow,
            staticMethods = staticCheck ? getMethods(iframeGlobalContext.Zepto.fn) : [],
            sharedMethods = sharedCheck ? getMethods(iframeGlobalContext.Zepto()) : [];

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
        for (i = 0, l = jqueryMethods.staticMethods.length; i < l; i++) {
            method = jqueryMethods.staticMethods[i];
            inZepto = inArray(method, zeptoMethods.staticMethods) > -1;
            staticMethods[method] = {
                jquery: true,
                zepto : inZepto
            }

        }

        //map Zepto and not jQuery static methods
        for (i = 0, l = zeptoMethods.staticMethods.length; i < l; i++) {
            method = zeptoMethods.staticMethods[i];
            merged = staticMethods.hasOwnProperty(method);
            if (!merged) {
                staticMethods[method] = {
                    jquery: false,
                    zepto : true
                }
            }

        }

        //map jQuery shared methods
        for (i = 0, l = jqueryMethods.sharedMethods.length; i < l; i++) {
            method = jqueryMethods.sharedMethods[i];
            inZepto = inArray(method, zeptoMethods.sharedMethods) > -1;
            sharedMethods[method] = {
                jquery: true,
                zepto : inZepto
            }

        }

        //map Zepto and not jQuery shared methods
        for (i = 0, l = zeptoMethods.sharedMethods.length; i < l; i++) {
            method = zeptoMethods.sharedMethods[i];
            merged = sharedMethods.hasOwnProperty(method);
            if (!merged) {
                sharedMethods[method] = {
                    jquery: false,
                    zepto : true
                }
            }

        }

        return {
            staticMethods : staticMethods,
            sharedMethods : sharedMethods
        };
    }

    function renderResults(method, methodObject, renderBody, compareOptions) {
        var isStatic = compareOptions._static,
            isCommon = compareOptions._common,
            isDiff = compareOptions._diff,
            tableRow,
            methodCell,
            jQueryResultCell,
            ZeptoResultCell;

        if (
            (
                isDiff
                &&
                methodObject.jquery === methodObject.zepto
            )
            ||
            (
               isCommon
               &&
               methodObject.jquery !== methodObject.zepto
            )
        ) {
            return;
        }

        tableRow = $('<tr>').addClass('method-row visible').attr('data-is-static', Number(isStatic));
        methodCell = $('<td>').addClass('method-cell cell').html(method);
        jQueryResultCell = $('<td>').addClass('jquery-cell cell');
        ZeptoResultCell = $('<td>').addClass('zepto-cell cell');

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
            .attr('data-is-common', Number(methodObject.zepto && methodObject.jquery))
            .append(methodCell, jQueryResultCell, ZeptoResultCell);

        renderBody.append(tableRow)

    }

    function renderStaticResults(resultObject, compareOptions) {
        for (var i in resultObject) {
            if (resultObject.hasOwnProperty(i)) {
                renderResults(i, resultObject[i], $STATIC_LIB_PROPS_TBODY, compareOptions);
            }
        }
    }

    function renderSharedResults(resultObject, compareOptions) {
        for (var i in resultObject) {
            if (resultObject.hasOwnProperty(i)) {
                renderResults(i, resultObject[i], $SHARED_LIB_PROPS_TBODY, compareOptions);
            }
        }
    }

    function disableControls() {
        $(':input').prop('disabled', true);
    }

    function enableControls() {
        $(':input').prop('disabled', false);
    }

    function resetContent() {
        $SHARED_LIB_PROPS_TBODY.html('');
        $STATIC_LIB_PROPS_TBODY.html('');
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
        $STATIC_LIB_PROPS_TBODY = $('#static-tbody');
        $SHARED_LIB_PROPS_TBODY = $('#shared-tbody');
        $STATIC_LIB_PROPS_TABLE = $('.static-table');
        $SHARED_LIB_PROPS_TABLE = $('.shared-table');
        $SCRIPTS_SANDBOX = $('#sandbox');
        $ZEPTO_VERSION_CONTROL = $('#zepto-versions');
        $JQUERY_VERSION_CONTROL = $('#jquery-versions');
        $STATIC_METHODS_CONTROL = $('#static-methods');
        $ESSSENCE_METHODS_CONTROLS = $('#essence-methods');
        $DIFF_METHODS_CONTROL = $('#diff-methods');
        $COMMON_METHOD_CONTROL = $('#common-methods');
        $COMPARE_CONTROL = $('#compare-control');

        hideRenderedResults();

        //set default options
        $STATIC_METHODS_CONTROL.prop('checked', true);
        $ESSSENCE_METHODS_CONTROLS.prop('checked', true);
        $DIFF_METHODS_CONTROL.prop('checked', false);
        $COMMON_METHOD_CONTROL.prop('checked', false);

        //disable controls, will enabled after libs version will loaded
        disableControls();

        //set methods controls via checkboxes handler
        $(':checkbox').on('change', function (e) {
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
                compareOptions = {
                    _static : $STATIC_METHODS_CONTROL.is(':checked'),
                    _essence : $ESSSENCE_METHODS_CONTROLS.is(':checked'),
                    _diff : $DIFF_METHODS_CONTROL.prop('checked'),
                    _common : $COMMON_METHOD_CONTROL.prop('checked')
                },
                jqueryMethods,
                zeptoMethods,
                jqueryDeffered = setScriptToSandbox(jqueryURL).done(function () {
                    jqueryMethods = getjQueryMethods(compareOptions);
                }),
                zeptoDeffered = setScriptToSandbox(zeptoURL).done(function () {
                    zeptoMethods = getZeptoMethods(compareOptions);
                });

            disableControls();

            removeScriptFromSandbox('jQuery');
            removeScriptFromSandbox('Zepto');
            removeScriptFromSandbox('$');

            $COMPARE_CONTROL.addClass('loading');
            $
                .when(jqueryDeffered, zeptoDeffered)
                .done(function () {
                    resetContent();
                    var result = mergeLibsMethods(jqueryMethods, zeptoMethods);
                    renderStaticResults(result.staticMethods, compareOptions);
                    renderSharedResults(result.sharedMethods, compareOptions);
                    showRenderedResults();
                })
                .always(function () {
                    enableControls();
                    setTimeout(function () {
                        $COMPARE_CONTROL.removeClass('loading');
                    }, 500)
                });

        });

        //start loading jQuery/Zepto libs version from GitHub
        $
            .when(getjQueryVersions(), getZeptoVersions())
            .always(function () {
                enableControls();
            });

    });

})(jQuery);
