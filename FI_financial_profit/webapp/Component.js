sap.ui.define(
    [
        "sap/ui/core/UIComponent",
        "sync/ca/fi/financial/model/models",
        "sap/f/FlexibleColumnLayoutSemanticHelper",
    ],
    (UIComponent, models, FCLSemanticHelper) => {
        "use strict";

        return UIComponent.extend("sync.ca.fi.financial.Component", {
            metadata: {
                manifest: "json",
                interfaces: ["sap.ui.core.IAsyncContentCreation"],
            },

            init() {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
                // enable routing
                this.getRouter().initialize();
                // App View 에서 사용하는 모델 추가
                var oData = {};
                // layout 은 사용자의 행동에 따라서
                // OneColumn <--> TwoColumnsMidExpanded
                var oJsonModel = new sap.ui.model.json.JSONModel(oData);

                this.setModel(oJsonModel, "app");
            },
            /**
             * 플렉서블 컬럼 레이아웃의 Semantic Helper의 객체를 가져온다.
             * Semantic Helper 객체는 특정 상황에 따라 플렉서블의 layout을 어떻게 할 건지 정보를 갖고 있다.
             * 예를 들어 중간 컬럼이 닫힐 경우 => 원 컬럼을 해야 한다 라는 정보를 주거나
             * OneColumn 에서 그 다음 layout은 어떤 layout이 되어야 하는가? 에서 TwoColumn~~에 대한 내용을 알려준다.
             */
            getFlexibleLayoutInfo: function () {
                var oFlexible = this.getRootControl().byId("fclId");
                var oSettings = {
                    defaultTwoColumnLayoutType:
                        sap.f.LayoutType.MidColumnFullScreen, // "TwoColumnsMidExpanded",
                    initialColumnsCount: 1,
                    maxColumnsCount: 2,
                };

                var oHelper = FCLSemanticHelper.getInstanceFor(
                    oFlexible,
                    oSettings
                );
                // new Class
                // Class.getInstance~~~
                return oHelper;
            },
        });
    }
);
