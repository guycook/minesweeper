var minesweeper = (function(d3, undefined) {
	var minesweeper = {};
	
	var blockSize = 24,
	    borderSize = 40;
	
	var state = 'playing',
	    size = { x: 1, y: 1 },
	    mines = 0,
	    board = [[0]],
	    revealed = [0];
	
	var svg;
	
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
		
		// Frist create empty 2d array accessable by arr[x][y] for board
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
				alert('Game over man');
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
	var identity = function(d) { return d; }
	var offsetX = function(d, i) { return 'translate(' + (borderSize + i * blockSize) + ', 0)'; }
	var offsetY = function(d, i) { return 'translate(0, ' + (borderSize + i * blockSize) + ')'; }
	
	var displayInit = function() {
		svg = d3.select('.minefield').append('svg');
	}
	
	var displayUpdate = function() {
		svg
			.attr('width', size.x * blockSize + borderSize * 2)
			.attr('height', size.y * blockSize + borderSize * 2);
		
		var columns = svg.selectAll('.column').data(board);
		
		// update
		var text = columns.selectAll('.base text').data(identity);
		text.text(identity);
		
		// enter columns/base
		columns.enter().append('g')
			.attr('class', 'column')
			.attr('transform', offsetX);
		
		var base = columns.selectAll('.base').data(identity);
		
		var baseG = base.enter().append('g')
			.attr('class', 'base')
			.attr('transform', offsetY);
		baseG.append('rect')
			.attr('width', blockSize)
			.attr('height', blockSize);
		baseG.append('text')
			.text(identity)
			.attr('transform', 'translate(' + blockSize * 0.5 + ', ' + blockSize * 0.5 + ')');
		
		// exit base
		base.exit().remove();
		
		// enter cover
		// Want a single element array with self reference if not revealed, empty otherwise
		var cover = svg.selectAll('.base').selectAll('.cover').data(function(d, i) { return revealed[i] ? [] : [i]; });
		
		cover.enter().append('rect')
			.attr('class', 'cover')
			.attr('width', blockSize)
			.attr('height', blockSize);
		
		cover.on('click', function(d) {
			if(state == 'playing' && !revealed[d]) {
				reveal(Math.floor(d / size.y), d % size.y);
				displayUpdate();
				if(state == 'playing' && revealed.length - revealed.filter(Object).length === mines) {
					state = 'victory';
					alert('Victory!');
				}
			}
		});
		
		// exit
		cover.exit().remove();
		columns.exit().remove();
	}
	
	// poor man's onload
	displayInit();
	minesweeper.newGame(8, 8, 10);
	d3.select('.newgame').on('click', function() {
		minesweeper.newGame(document.getElementById('boardwidth').value, document.getElementById('boardheight').value, document.getElementById('nummines').value);
	});
	
	return minesweeper;
})(d3);
