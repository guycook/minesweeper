var minesweeper = (function(d3, undefined) {
	var minesweeper = {};
	
	var blockSize = 24,
	    borderSize = 100,
	    padding = 1;
	
	var state = 'playing',
	    size = { x: 1, y: 1 },
	    mines = 0,
	    board = [[0]],
	    revealed = [0],
	    xray = false;
	
	var svg,
	    colourMap = {
	    	'x': '#fb5635',
	    	0: '#70c4df',
	    	1: '#a8e2fa',
	    	2: '#e7fffe',
	    	3: '#f4ffe0',
	    	4: '#fcfdad',
	    	5: '#fff577',
	    	6: '#ffe247',
	    	7: '#f3b224',
	    	8: '#e0770d'
	    };
	
	var surrounds = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
	
	// Reset game state based on input size, then update display
	minesweeper.newGame = function(width, height, mineCount) {
		size.x = parseInt(width, 10) || 0;
		size.y = parseInt(height, 10) || 0;
		mines = parseInt(mineCount, 10) || 0;
		
		// Sanity check
		if(size.x < 2 || size.y < 2 || mines < 1 || mines > size.x * size.y * 0.5) {
			alert('oh, behave!');
			return;
		}
		
		state = 'playing';
		
		// First create empty 2d array accessable by arr[x][y] for board
		var col = new Array(size.y);
		board = Array.apply(null, new Array(size.x)).map(function() { return col.slice(); });
		
		// revealed is 1d array of revealed spaces ordered by column then row
		revealed = new Array(size.x * size.y);
		
		// Place some mines
		var minesLeft = mines, mx, my;
		while(minesLeft) {
			mx = Math.floor(Math.random() * size.x);
			my = Math.floor(Math.random() * size.y);
			if(board[mx][my] !== 'x') {
				board[mx][my] = 'x';
				--minesLeft;
			}
		}
		
		// Precompute neighbour mine count and add to board
		for(var x = 0; x < size.x; x++) {
			for(var y = 0; y < size.y; y++) {
				if(board[x][y] !== 'x') {
					var neighbours = 0; 
					surrounds.forEach(function(e) {
						if(board[x + e[0]] && board[x + e[0]][y + e[1]] === 'x')
							++neighbours;
					});
					board[x][y] = neighbours;
				}
			}
		}
		
		displayUpdate();
	}
	
	var reveal = function(x, y) {
		if(!revealed[x * size.y + y]) {
			revealed[x * size.y + y] = true;
			var thisSquare = board[x][y];
			if(thisSquare === 'x') {
				state = 'loss';
			}
			else if(thisSquare === 0) {
				surrounds.forEach(function(e) {
					var nx = x + e[0], ny = y + e[1];
					if(nx >= 0 && nx < size.x && ny >= 0 && ny < size.y) {
						reveal(nx, ny);
					}
				});
			}
		}
	}
	
	// d3 helpers
	var identity = function(d) { return d; },
	    offset = function(d) { return (borderSize + d * (blockSize + padding)) },
	    offsetX = function(d, i) { return 'translate(' + offset(i) + ', 0)'; },
	    offsetY = function(d, i) { return 'translate(0, ' + offset(i) + ')'; }
	
	// One time set up of svg and definitions
	var displayInit = function() {
		svg = d3.select('.minefield').append('svg');
		var defs = svg.append('defs');
		
		var coverBase = defs.append('radialGradient').attr('id', 'coverBase');
		coverBase.append('stop').attr('offset', '0%').attr('stop-color', '#152838');
		coverBase.append('stop').attr('offset', '100%').attr('stop-color', '#0E1D2B');
		
		var coverShine = defs.append('linearGradient').attr('id', 'coverShine')
			.attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
		coverShine.append('stop').attr('offset', '0%').attr('stop-color', '#FFFFFF').attr('stop-opacity', 0.1);
		coverShine.append('stop').attr('offset', '83%').attr('stop-color', '#FFFFFF').attr('stop-opacity', 0);
		
		// X-ray clipping path is a donut with huge outer radius
		var annulus = defs.append('clipPath').attr('id', 'annulus');
		annulus.append('path').attr('d', d3.svg.arc()
			.innerRadius(blockSize * 1.5)
			.outerRadius(10000)
			.startAngle(0)
			.endAngle(Math.PI * 2));
		
		svg.on('mousemove', function() {
			if(xray) {
				var position = d3.mouse(this);
				annulus.attr('transform', 'translate(' + position[0] + ', ' + position[1] + ')');
			}
		});
	}
	
	// d3 description of playing field
	var displayUpdate = function() {
		var boardWidth = size.x * (blockSize + padding),
		    boardHeight = size.y * (blockSize + padding);
		
		svg
			.attr('width', boardWidth + borderSize * 2)
			.attr('height', boardHeight + borderSize * 2);
		
		var border = svg.selectAll('.border').data([1]);
		border.enter().append('rect').attr('class', 'border');
		border
			.attr('x', borderSize - 2)
			.attr('y', borderSize - 2)
			.attr('width', boardWidth + 3)
			.attr('height', boardHeight + 3);
		
		var baseContainer = svg.selectAll('.basecontainer').data([1]);
		baseContainer.enter().append('g').attr('class', 'basecontainer');
		
		// enter columns/base/text
		var columns = baseContainer.selectAll('.column').data(board);
		
		columns.enter().append('g')
			.attr('class', 'column')
			.attr('transform', offsetX);
		
		var base = columns.selectAll('.base').data(identity);
		
		var baseG = base.enter().append('g')
			.attr('class', 'base')
			.attr('transform', offsetY);
		baseG.append('rect')
			.attr('class', 'bg')
			.attr('width', blockSize)
			.attr('height', blockSize);
		baseG.append('text')
			.attr('transform', 'translate(' + blockSize * 0.5 + ', ' + blockSize * 0.5 + ')');
		
		columns.selectAll('.base text').data(identity)
			.text(identity)
			.style('fill', function(d) { return colourMap[d]; });
		
		// exit
		base.exit().remove();
		columns.exit().remove();
		
		var coverContainer = svg.selectAll('.covercontainer').data([1]);
		coverContainer.enter().append('g')
			.attr('class', 'covercontainer');
		
		coverContainer.attr('clip-path', xray ? 'url(#annulus)' : null);
		
		// enter cover
		var cover = coverContainer.selectAll('.cover').data(revealed);
		
		cover.enter().append('g').attr('class', 'cover');
		
		cover.selectAll('.coverbase').data([1]).enter().append('rect')
			.attr('class', 'coverbase')
			.attr('width', blockSize)
			.attr('height', blockSize)
			.style('fill', 'url(#coverBase)');
		
		cover.selectAll('.covershine').data([1]).enter().append('polygon')
			.attr('class', 'covershine')
			.attr('points', '0,0 ' + blockSize + ',0 0,' + blockSize)
			.style('fill', 'url(#coverShine)');
		
		// update
		cover
			.attr('transform', function(d, i) { return 'translate(' + offset(Math.floor(i / size.y)) + ', ' + offset(i % size.y) + ')'; })
			.on('click', function(d, i) {
				if(state === 'playing' && !d) {
					reveal(Math.floor(i / size.y), i % size.y);
					if(state === 'playing' && revealed.length - revealed.filter(Object).length === mines) {
						state = 'victory';
					}
					displayUpdate();
				}
			})
			.transition().duration(500)
				.attr('opacity', function(d) { return d ? 0 : 1; })
			.transition()
				.attr('visibility', function(d) { return d ? 'hidden' : 'visible'; });
		
		// exit
		cover.exit().remove();
		
		// Game over message
		var stateMessage = svg.selectAll('.state').data(state === 'playing' ? [] : [1]);
		
		stateMessage.enter().append('text')
			.attr('class', 'state ' + state)
			.attr('opacity', 0)
			.attr('transform', 'translate(' + (boardWidth * 0.5 + borderSize) + ', ' + (boardHeight * 0.5 + borderSize) + ')')
			.transition().duration(1500)
				.attr('opacity', 1);
		
		stateMessage.text(state === 'victory' ? 'Congratulations!' : 'GAME OVER');
		
		stateMessage.exit().transition().duration(300)
			.attr('opacity', 0)
			.remove();
	}
	
	// poor man's onload
	displayInit();
	
	d3.select('.newgame').on('click', function() {
		d3.selectAll('.cover').attr('opacity', 1).attr('visibility', 'visible');
		minesweeper.newGame(document.getElementById('boardwidth').value, document.getElementById('boardheight').value, document.getElementById('nummines').value);
	});
	
	d3.select('#xr').on('change', function() {
		xray = this.checked;
		displayUpdate();
	});
	
	minesweeper.newGame(8, 8, 10);
	
	return minesweeper;
})(d3);
