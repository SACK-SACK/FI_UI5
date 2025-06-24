sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sync/ca/fi/documentapp/controller/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
    ], (Controller, formatter, Filter, FilterOperator) => {
        "use strict";

    return Controller.extend("sync.ca.fi.documentapp.controller.Main", {
        formatter: formatter,
        onInit() {
            // 초기화 로직 작성
        },

        //IconTabBar에서 탭을 눌렀을 때 실행
        onFilterSelect: 
        function(oEvent) {
            var sKey = oEvent.getParameter("key"); // 올바른 Key 값을 가져오기
            console.log(sKey); //Key 값 확인용 
            this._applyFilter(sKey) // 필터 적용 함수 호출(눌린 Key 가져감)
        },
        
        onItemPress: function (oEvent) {
            // Item이 눌렸을 때
            console.log("onItemPress triggered");
        
            // 클릭한 항목의 OData 바인딩 경로를 가져옴.
            const oCtx = oEvent.getSource().getBindingContext();
            const sPath = oCtx.getPath();  // 예: "/ZCA_CDS_V_005(Belnr='1234',...)"

            // 현재 Main.view.xml을 기준으로 View 객체를 참조
            const oView = this.getView();
            const oFCL = oView.byId("fcl");

            // 바인딩 경로가 없으면 종료
            if (!oFCL) {
                console.error("FlexibleColumnLayout(fcl) not found in this view.");
                return;
            }

            // Detail View를 동적으로 로드
            sap.ui.core.mvc.XMLView.create({
                viewName: "sync.ca.fi.documentapp.view.Detail"
            }).then(function (oDetailView) {
                // 바인딩
                oDetailView.bindElement({ path: sPath });

                // 기존 중간 컬럼 비우고 새로 넣기
                oFCL.removeAllMidColumnPages();
                oFCL.addMidColumnPage(oDetailView);

                // Layout 전환
                oFCL.setLayout("TwoColumnsMidExpanded");
            }).catch(function (err) {
                console.error("Detail View 로딩 실패:", err);
            });
        },

        //필터 적용 함수 : All이면 전체  아니면 AppStatus EQ sKey 값
        _applyFilter: function(sKey) {
            var oSmartList = this.byId("DocumentSmartList"); // SmartList ID로 접근
            var oList = oSmartList.getList(); // 내부 List 얻기
            var oBinding = oList.getBinding("items"); // List의 아이템 바인딩

            if (!oBinding) return; // 바인딩이 아직 없으면 종료

            if (sKey === "All") {
                oBinding.filter([]); // 전체 표시 (필터 제거)
            } else {
                var aFilters = [
                    new Filter("AppStatus", FilterOperator.EQ, sKey)
                ];
                oBinding.filter(aFilters); // AppStatus로 필터링
            }
        }
    });
});    