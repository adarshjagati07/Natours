class APIFeatures {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }
    filter() {
        //Filtering
        const queryObject = { ...this.queryStr };
        const excludedFields = ['page', 'sort', 'limit', 'fields']; //from queryObject we will delete these fields.
        excludedFields.forEach((el) => delete queryObject[el]);

        //Advanced Filtering
        let queryStr = JSON.stringify(queryObject);
        queryStr = queryStr.replace(
            /\b(gte|gt|lte|lt)\b/g,
            (match) => `$${match}`,
        );

        this.query.find(JSON.parse(queryStr));
        return this; //ie. entire object, such that we can chain methods.
    }

    sort() {
        if (this.queryStr.sort) {
            const sortBy = this.queryStr.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    limitFields() {
        if (this.queryStr.fields) {
            const reqFields = this.queryStr.fields.split(',').join(' ');
            this.query = this.query.select(reqFields);
        } else {
            this.query = this.query.select('-__v');
        }

        return this;
    }

    paginate() {
        const page = this.queryStr.page * 1 || 1;
        const limit = this.queryStr.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = APIFeatures;
