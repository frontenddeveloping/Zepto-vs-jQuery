jQuery.noConflict();
(function (undefined){

    /*
    *   TODO add methods counter, preloader and load scripts from git hub API
    * */


    //libs version-url object
    var libsObject = {
        zepto : {
            "1.0.1" : "libs/zepto-1.0.1.js"
        },
        jquery : {
            "1.10.1" : "libs/jquery-1.10.1.js",
            "2.0.3" : "libs/jquery-2.0.3.js"
        }
    };

    //cache selectors
    var staticRenderBody = jQuery('#static-tbody'),
        sharedRenderBody = jQuery('#shared-tbody'),
        staticTable = jQuery('.static-table'),
        sharedTable = jQuery('.shared-table');

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

    function getScriptURL(lib, version) {
        var url;
        try {
            url = libsObject[lib][version];
        } catch(e) {
            url = '';
        }

        return url;
    }

    function getMethods(essence, isOwn) {
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
            staticMethods = staticCheck ? getMethods(jQuery.fn) : [],
            sharedMethods = sharedCheck ? getMethods(jQuery()) : [];

        return {
            staticMethods : staticMethods,
            sharedMethods : sharedMethods
        }
    }

    function getZeptoMethods(options) {
        options = options || {};
        var staticCheck = options._static,
            sharedCheck = options._essence,
            staticMethods = staticCheck ? getMethods(Zepto.fn) : [],
            sharedMethods = sharedCheck ? getMethods(Zepto()) : [];

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

    function loadScript(scriptURL, successCallback) {
        console.log(scriptURL);
        return jQuery.getScript(scriptURL, successCallback);
    }

    function renderResults(method, methodObject, isStatic, renderBody) {
        isStatic = isStatic || false;
        var tableRow = $('<tr>').addClass('method-row visible').attr('data-is-static', Number(isStatic)),
            methodCell = $('<td>').addClass('method-cell cell').html(method),
            jQueryResultCell = $('<td>').addClass('jquery-cell cell'),
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

    function renderStaticResults(resultObject) {
        for (var i in resultObject) {
            if (resultObject.hasOwnProperty(i)) {
                renderResults(i, resultObject[i], true, staticRenderBody);
            }
        }
    }

    function renderSharedResults(resultObject) {
        for (var i in resultObject) {
            if (resultObject.hasOwnProperty(i)) {
                renderResults(i, resultObject[i], false, sharedRenderBody);
            }
        }
    }

    function disableControls() {
        jQuery(':input').prop('disabled', true);
    }

    function enableControls() {
        jQuery(':input').prop('disabled', false);
    }

    function resetContent() {
        sharedRenderBody.html('');
        staticRenderBody.html('');
    }

    function testFrameworks(zeptoVersion, jqueryVersion, compareOptions) {
        var jqueryURL = getScriptURL('jquery', jqueryVersion),
            zeptoURL = getScriptURL('zepto', zeptoVersion),
            jqueryMethods,
            zeptoMethods,
            jqueryXHR = loadScript(jqueryURL, function (data) {
                jqueryMethods = getjQueryMethods(compareOptions);
            }),
            zeptoXHR = loadScript(zeptoURL, function (data) {
                zeptoMethods = getZeptoMethods(compareOptions);
            });

        disableControls();

        jQuery
            .when(jqueryXHR, zeptoXHR)
            .done(function () {
                resetContent();
                var result = mergeLibsMethods(jqueryMethods, zeptoMethods);
                renderStaticResults(result.staticMethods);
                renderSharedResults(result.sharedMethods);
            })
            .always(function () {
                enableControls();
            });
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

    jQuery(function () {
        var $zeptoVersionControl = jQuery('#zepto-version'),
            $jqueryVersionControl = jQuery('#jquery-version'),
            $staticMethodsControl = jQuery('#static-methods'),
            $essenceMethodsControl = jQuery('#essence-methods'),
            $diffMethodsControl = jQuery('#diff-methods'),
            $commonMethodControl = jQuery('#common-methods'),
            controlsHandler = function () {
                var zeptoVersion = $zeptoVersionControl.val(),
                    jqueryVersion = $jqueryVersionControl.val(),
                    compareOptions = {
                        _static : $staticMethodsControl.is(':checked'),
                        _essence : $essenceMethodsControl.is(':checked')
                    },
                    controlNode = this;

                if (controlNode === $diffMethodsControl.get(0)) {
                    if ($diffMethodsControl.prop('checked')) {
                        $commonMethodControl.prop('checked', false);
                        showDiffMethods();
                        hideCommonMethods();
                    } else {
                        showCommonMethods();
                    }
                } else if (controlNode === $commonMethodControl.get(0)) {
                    if ($commonMethodControl.prop('checked')) {
                        $diffMethodsControl.prop('checked', false);
                        showCommonMethods();
                        hideDiffMethods();
                    } else {
                        showDiffMethods();
                    }
                } else if (controlNode === $staticMethodsControl.get(0)) {
                    if ($staticMethodsControl.prop('checked')) {
                        staticTable.show();
                    } else {
                        staticTable.hide();
                    }
                } else if (controlNode === $essenceMethodsControl.get(0)) {
                    if ($essenceMethodsControl.prop('checked')) {
                        sharedTable.show();
                    } else {
                        sharedTable.hide();
                    }
                } else {
                    testFrameworks(zeptoVersion, jqueryVersion, compareOptions);
                }
            };
        $staticMethodsControl.prop('checked', true);
        $essenceMethodsControl.prop('checked', true);
        $diffMethodsControl.prop('checked', false);
        $commonMethodControl.prop('checked', false);

        jQuery(':input').on('change', controlsHandler);

        controlsHandler();
    });

})();
