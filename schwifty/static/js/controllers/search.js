
var loadSearchResult = ['$http', '$q', '$route', 'queryState',
    function($http, $q, $route, queryState) {

  var dfd = $q.defer();
  var query = angular.copy(queryState.get());
  query['facet'] = ['source', 'schema']
  $http.get('/api/search', {params: query}).then(function(res) {
    console.log(res.data);
    dfd.resolve(res.data);
  });
  return dfd.promise;

}];


schwifty.controller('SearchController', ['$scope', '$http', 'results', 'metadata',
  function($scope, $http, results, metadata) {

  $scope.metadata = metadata;
  $scope.results = results;
  $scope.detail = null;

  console.log("Get schwifty!");

  $scope.showDetail = function(result) {
    // $scope.query.set('detail', result.type + '/' + result.id);
    $scope.detail = result;
    return false;
  };

}]);
