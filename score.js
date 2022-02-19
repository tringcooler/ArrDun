const ARSCORE = (() => {
    
    const [
        
        PL_ORDERBUF, PL_SEQBUF,
        
        MTD_SORT_BUF, MTD_MAKE_MAT,
        
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    class c_score {
        
        constructor() {
            this.reset();
        }
        
        reset() {
            this[PL_ORDERBUF] = [[]];
        }
        
        put(hit, val) {
            let olen = this[PL_ORDERBUF].length;
            let seq = this[PL_ORDERBUF][olen - 1];
            if(hit) {
                seq.push(val);
            } else if(seq.length > 0){
                this[PL_ORDERBUF].push([]);
            }
        }
        
        [MTD_SORT_BUF]() {
            this[PL_ORDERBUF].sort((a, b) => b.length - a.length);
        }
        
        [MTD_MAKE_MAT](cb_val = null) {
            let mat = [];
            let wid = this[PL_ORDERBUF][0].length;
            let black = false;
            let last_row = null;
            for(let seq of this[PL_ORDERBUF]) {
                if(seq.length === 0) {
                    break;
                }
                black = !black;
                let row = [];
                let last_val = null;
                for(let val of seq) {
                    let pval = val;
                    if(cb_val) {
                        pval = cb_val(val, last_val);
                        last_val = val;
                    }
                    row.push([pval, black]);
                }
                for(let i = row.length; i < wid; i++) {
                    row.push([null, last_row[i][1]]);
                }
                mat.push(row);
                last_row = row;
            }
            return mat;
        }
        
        score() {
            this[MTD_SORT_BUF]();
            return this[MTD_MAKE_MAT]();
        }
        
    }
    
    test_score = (seq) => {
        let sc = new c_score();
        for(let num of seq) {
            for(let i = 0; i < num; i++) {
                sc.put(true, num);
            }
            sc.put(false, null);
        }
        let mat = sc.score();
        return mat.map(r=>r.map(v=>(v[1]?1:0)+(v[0]?20:10)));
    }
    
    return c_score;
    
})();