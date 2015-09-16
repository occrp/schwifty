
schwifty.directive('searchFacet', ['$http', 'metadataService',
    function($http, metadataService) {
  return {
    restrict: 'E',
    scope: {
      'results': '=',
      'facet': '@',
      'title': '@',
      'type': '@'
    },
    templateUrl: 'search_facet.html',
    link: function (scope, element, attrs, model) {
      scope.result = [];
      scope.meta = {};

      scope.$watch('results', function(res) {
        if (res === null) return;

        metadataService.get().then(function(meta) {
          scope.result = res.facets[scope.facet];
          scope.meta = meta[scope.type];
          console.log(res, scope.facet, scope.type);
        });
      });
    }
  };
}]);