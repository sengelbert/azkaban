/*
 * Copyright 2012 LinkedIn Corp.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

azkaban.JobListView = Backbone.View.extend({
	events: {
		"keyup input": "filterJobs",
		"click .job": "handleJobClick",
		"click #resetPanZoomBtn": "handleResetPanZoom",
		"contextmenu li.listElement": "handleContextMenuClick",
		"change .autoPanZoom" : "handleAutoPanZoom",
		"click .expandarrow" : "handleToggleMenuExpand"
	},
	initialize: function(settings) {
		this.model.bind('change:selected', this.handleSelectionChange, this);
		this.model.bind('change:disabled', this.handleDisabledChange, this);
		this.model.bind('change:graph', this.render, this);
		this.model.bind('change:update', this.handleStatusUpdate, this);
		
		this.filterInput = $(this.el).find("#filter");
		this.list = $(this.el).find("#joblist");
		this.contextMenu = settings.contextMenuCallback;
		this.listNodes = {};
	},
	filterJobs: function(self) {
		var filter = this.filterInput.val();
		// Clear all filters first
		if (!filter || filter.trim() == "") {
			this.unfilterAll(self);
			return;
		}
		
		this.hideAll(self);
		var showList = {};
		
		// find the jobs that need to be exposed.
		for (var key in this.listNodes) {
			var li = this.listNodes[key];
			var node = li.node;
			var nodeName = node.id;
			node.listElement = li;

			var index = nodeName.indexOf(filter);
			if (index != -1) {
				var spanlabel = $(li).find("> a > span");
				
				var endIndex = index + filter.length;
				var newHTML = nodeName.substring(0, index) + "<span class=\"filterHighlight\">" + 
					nodeName.substring(index, endIndex) + "</span>" + 
					nodeName.substring(endIndex, nodeName.length);
				$(spanlabel).html(newHTML);
				
				// Apply classes to all the included embedded flows.
				var pIndex = key.length;
				while((pIndex = key.lastIndexOf(":", pIndex - 1)) > 0) {
					var parentId = key.substr(0, pIndex);
					var parentLi = this.listNodes[parentId];
					$(parentLi).show();
					$(parentLi).addClass("subFilter");
				}
				
				$(li).show();
			}
		}
	},
	hideAll: function(self) {
		for (var key in this.listNodes) {
			var li = this.listNodes[key];
			var label = $(li).find("> a > span");
			$(label).text(li.node.id);
			$(li).removeClass("subFilter");
			$(li).hide();
		}
	},
	unfilterAll: function(self) {
		for (var key in this.listNodes) {
			var li = this.listNodes[key];
			var label = $(li).find("> a > span");
			$(label).text(li.node.id);
			$(li).removeClass("subFilter");
			$(li).show();
		}
	},
	handleStatusUpdate: function(evt) {
		var updateData = this.model.get("update");
		if (updateData.nodes) {
			for (var i = 0; i < updateData.nodes.length; ++i) {
				var updateNode = updateData.nodes[i];
				var job = this.listNodes[updateNode.id];
				$(job).removeClass();
				$(job).addClass("list-group-item");
				$(job).addClass(updateNode.status);
			}
		}
	},
	changeStatuses: function(data) {
		for (var i = 0; i < data.nodes.length; ++i) {
			var node = data.nodes[i];
			if (node.status) {
				var liElement = node.listElement;
				$(liElement).removeClass(statusList.join(' '));
				$(liElement).addClass(node.status);
			}
			
			if (node.flowData) {
				this.changeStatuses(node.flowData);
			}
		}
	},
	render: function(self) {
		var data = this.model.get("data");
		var nodes = data.nodes;
		
		this.renderTree(this.list, data);
//		
//		this.assignInitialStatus(self);
//		this.handleDisabledChange(self);
	},
	renderTree : function(el, data, prefix) {
		var nodes = data.nodes;
		if (nodes.length == 0) {
			console.log("No results");
			return;
		};
		if (!prefix) {
			prefix = "";
		}
	
		var nodeArray = nodes.slice(0);
		nodeArray.sort(function(a, b) {
			var diff = a.y - b.y;
			if (diff == 0) {
				return a.x - b.x;
			}
			else {
				return diff;
			}
		});
		
		var ul = document.createElement('ul');
		for(var i=0; i < nodeArray.length; ++i) {
			var li = document.createElement("li");
			$(li).addClass("listElement");
			
			// This is used for the filter step.
			var listNodeName = prefix + nodeArray[i].id;
			this.listNodes[listNodeName]=li;
			li.node = nodeArray[i];
			li.node.listElement = li;

			var a = document.createElement("a");
			var iconDiv = document.createElement('div');
			$(iconDiv).addClass('icon');
			
			$(a).append(iconDiv);
			$(a).addClass('list-group-item').addClass('job');
			
			var span = document.createElement("span");
			$(span).text(nodeArray[i].id);
			$(span).addClass("jobname");
			$(a).append(span);
			$(li).append(a);
			$(ul).append(li);
			
			if (nodeArray[i].flowData) {
				// Add the up down
				var expandDiv = document.createElement("div");
				$(expandDiv).addClass("expandarrow glyphicon glyphicon-chevron-down");
				$(a).append(expandDiv);
				
				// Create subtree
				var subul = this.renderTree(li, nodeArray[i].flowData, listNodeName + ":");
				$(subul).hide();
			}
		}
		
		$(el).append(ul);
		return ul;
	},
	handleMenuExpand: function(li) {
		var expandArrow = $(li).find("> a > .expandarrow");
		var submenu = $(li).find("> ul");
		
		$(expandArrow).removeClass("glyphicon-chevron-down");
		$(expandArrow).addClass("glyphicon-chevron-up");
		$(submenu).slideDown();
	},
	handleMenuCollapse: function(li) {
		var expandArrow = $(li).find("> a > .expandarrow");
		var submenu = $(li).find("> ul");
		
		$(expandArrow).removeClass("glyphicon-chevron-up");
		$(expandArrow).addClass("glyphicon-chevron-down");
		$(submenu).slideUp();
	},
	handleToggleMenuExpand: function(evt) {
		var expandarrow = evt.currentTarget;
		var li = $(evt.currentTarget).closest("li.listElement");
		var submenu = $(li).find("> ul");

		if ($(submenu).is(":visible")) {
			this.handleMenuCollapse(li);
		}
		else {
			this.handleMenuExpand(li);
		}
		
		evt.stopImmediatePropagation();
	},
	handleContextMenuClick: function(evt) {
		if (this.contextMenu) {
			this.contextMenu(evt, this.model, evt.currentTarget.node);
			return false;
		}
	},
	handleJobClick: function(evt) {
		console.log("Job clicked");
		var li = $(evt.currentTarget).closest("li.listElement");
		var node = li[0].node;
		if (!node) {
			return;
		}
		
		if (this.model.has("selected")) {
			var selected = this.model.get("selected");
			if (selected == node) {
				this.model.unset("selected");
			}
			else {
				this.model.set({"selected": node});
			}
		}
		else {
			this.model.set({"selected": node});
		}

	},
	handleDisabledChange: function(evt) {
		var disabledMap = this.model.get("disabled");
		var nodes = this.model.get("nodes");
		
		for(var id in nodes) {
			if (disabledMap[id]) {
				$(this.listNodes[id]).addClass("nodedisabled");
			}
			else {
				$(this.listNodes[id]).removeClass("nodedisabled");
			}
		}
	},
	handleSelectionChange: function(evt) {
		if (!this.model.hasChanged("selected")) {
			return;
		}
		
		var previous = this.model.previous("selected");
		var current = this.model.get("selected");

		if (previous) {
			$(previous.listElement).removeClass("active");
		}
		
		if (current) {
			$(current.listElement).addClass("active");
			this.propagateExpansion(current.listElement);
		}
	},
	propagateExpansion: function(li) {
		var li = $(li).parent().closest("li.listElement")[0];
		if (li) {
			this.propagateExpansion(li);
			this.handleMenuExpand(li);
		}
	},
	handleResetPanZoom: function(evt) {
		this.model.trigger("resetPanZoom");
	},
	handleAutoPanZoom: function(evt) {
		this.model.set({"autoPanZoom": $(evt.currentTarget).is(':checked')});
	}
});
