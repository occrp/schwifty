
spindle.directive('entityEditor', ['$http', '$document', '$rootScope', 'authz', 'schemaService', 'metadataService',
    function($http, $document, $rootScope, authz, schemaService, metadataService) {
  return {
    restrict: 'E',
    transclude: false,
    scope: {
      'model': '=',
      'collection': '='
    },
    templateUrl: 'entities/editor.html',
    controller: ['$scope', function($scope) {

      var apiUrl = '/api/collections/' + $scope.collection.id + '/entities';
      $scope.editable = authz.collection(authz.WRITE, $scope.collection.id);

      var selectedCell = null;

      $rootScope.$on('keydown', function(e, $event) {
        if (selectedCell == null) {
          return;
        }
        var rows = $scope.rows.length - 1, columns = $scope.columns.length - 1;
        
        // press enter to go into edit mode
        if ($event.keyCode == 13) {
          if (selectedCell.editing) {
            if (selectedCell.colIdx < columns) {
              $scope.clickCell(selectedCell.rowIdx, selectedCell.colIdx + 1);
            } else if (selectedCell.rowIdx < rows) {
              $scope.clickCell(selectedCell.rowIdx + 1, 0);
            }
          } else {
            $scope.editCell(selectedCell);  
          }
        }

        // press tab to go to the next field
        if ($event.keyCode == 9) {
          if ($event.altKey || $event.shiftKey) { // alt inverts the behaviour
            if (selectedCell.colIdx > 0) {
              $scope.clickCell(selectedCell.rowIdx, selectedCell.colIdx - 1);
            } else if (selectedCell.rowIdx > 0) {
              $scope.clickCell(selectedCell.rowIdx - 1, columns);
            }
          } else {
            if (selectedCell.colIdx < columns) {
              $scope.clickCell(selectedCell.rowIdx, selectedCell.colIdx + 1);
            } else if (selectedCell.rowIdx < rows) {
              $scope.clickCell(selectedCell.rowIdx + 1, 0);
            }  
          }
          $event.preventDefault();
        }

        if ($event.keyCode == 38 && !selectedCell.editing) {
          // go up.
          if (selectedCell.rowIdx > 0) {
            $scope.clickCell(selectedCell.rowIdx - 1, selectedCell.colIdx);
            $event.preventDefault();
          }
        } else if ($event.keyCode == 40 && !selectedCell.editing) {
          // go down.
          if (selectedCell.rowIdx < rows) {
            $scope.clickCell(selectedCell.rowIdx + 1, selectedCell.colIdx);
            $event.preventDefault();
          }
        } else if ($event.keyCode == 39 && !selectedCell.editing) {
          // go right.
          if (selectedCell.colIdx < columns) {
            $scope.clickCell(selectedCell.rowIdx, selectedCell.colIdx + 1);
            $event.preventDefault();
          }
        } else if ($event.keyCode == 37 && !selectedCell.editing) {
          // go left.
          if (selectedCell.colIdx > 0) {
            $scope.clickCell(selectedCell.rowIdx, selectedCell.colIdx - 1);
            $event.preventDefault();
          }
        }
      });

      $scope.clickCell = function(rowIdx, colIdx, $event) {
        var cell = $scope.rows[rowIdx].cells[colIdx];
        cell.rowIdx = rowIdx;
        cell.colIdx = colIdx;
        if (cell.selected) {
          $scope.editCell(cell);
        } else {
          $scope.selectCell(cell);
        }
        if ($event) {
          $event.stopPropagation();  
        }
      };

      $scope.editCell = function(cell) {
        if ($scope.editable) {
          cell.editing = true;
          cell.dirty = true;
          $scope.$broadcast('editBind', cell.serial);  
        }
      };

      $scope.selectCell = function(cell) {
        if (selectedCell != null) {
          selectedCell.selected = false;  
          selectedCell.editing = false;

          if (cell == null || cell.rowIdx != selectedCell.rowIdx) {
            $scope.saveRow(selectedCell.rowIdx);
          }
        }
        if (cell != null) {
          cell.selected = true;  
        }
        selectedCell = cell;
      };

      $scope.saveRow = function(idx) {
        if (!$scope.editable) return;

        var row = $scope.rows[idx],
            data = {},
            hasData = false;
        if (row.data && row.data.id) {
          data.id = row.data.id;
          data.$schema = row.data.$schema;
        } else {
          data = row.data;
        }
        for (var i in row.cells) {
          var cell = row.cells[i];
          if (cell.dirty) {
            hasData = true;
          }
          if (cell.data) {
            data[cell.model.name] = cell.data;            
          }
        }
        if (hasData) {
          $http.post(apiUrl, data).then(function(res) {
            $scope.rows[idx].failed = false;
            if (res.status == 201) { // new record
              addStubRow();
            }
          }, function(err) {
            $scope.rows[idx].failed = true;
          });  
        }
      };

      angular.element($document).on('click', function(event) {
        // this will listen to all clicks and blur the current cell when
        // it happens outside the editor.
        if (!$(event.target).closest('.entity-editor-cell').length) {
          if (selectedCell != null) {
            $scope.selectCell(null);
            $scope.$apply();  
          }
        }
      });

      var loadData = function() {
        var params = {$schema: $scope.model.schema.id};
        return $http.get(apiUrl, {params: params});
      };

      var getModelColumns = function(model, metadata) {
        var columns = [], models = model.getPropertyModels().sort(spindleModelSort);
        for (var i in models) {
          var model = models[i],
              hidden = model.schema.hidden || model.isArray || model.schema.inline;
          if (!hidden) {
            columns.push({
              title: model.getTitle(),
              model: model
            });  
          }
        }
        return columns;
      };

      var getRows = function(columns, entities) {
        var rows = []
        for (var i in entities.results) {
          var entity = entities.results[i], cells = [];
          for (var j in columns) {
            var column = columns[j], value = entity[column.model.name];
            cells.push(schemaService.bindModel(value, column.model));
          }
          rows.push({
            cells: cells,
            data: entity,
            edit: false
          });
        }
        return rows;
      };

      var addStubRow = function() {
        var cells = [];
        for (var j in $scope.columns) {
          var column = $scope.columns[j];
          cells.push(schemaService.bindModel(undefined, column.model));
        }
        $scope.rows.push({
          cells: cells,
          data: {$schema: $scope.model.schema.id},
          edit: false
        });
      };

      var init = function() {
        metadataService.get().then(function(metadata) {
          loadData().then(function(res) {
            $scope.columns = getModelColumns($scope.model, metadata);
            $scope.rows = getRows($scope.columns, res.data);
            for (var i in [1, 2]) {
              addStubRow();
            }
          });
        });
      };

      init();
    }]
  };
}]);